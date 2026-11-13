import { describe, it, expect } from 'vitest'
import { createEvent, stateFor, localDay } from './movements'
import type { Action, MovementEvent } from './types'
const day = '2026-11-13'
const time = new Date(2026,10,13,8,0).getTime()
function sequence(actions: Action[]) {
  const events: MovementEvent[] = []
  actions.forEach((a,i) => { const e = createEvent('e1', events, a, time+i*1000, `id${i}`); if(e) events.push(e) })
  return events
}
describe('журнал перемещений', () => {
  it('считает локальную календарную дату', () => expect(localDay(new Date(2026,0,2,0,5))).toBe('2026-01-02'))
  it('не создаёт событий до первого прибытия', () => expect(stateFor([], 'e1', day).location).toEqual({status:'not_arrived'}))
  it('регистрирует прибытие и смену кабинета, игнорируя повтор', () => {
    const es = sequence([{kind:'room',roomId:'r1'},{kind:'room',roomId:'r1'},{kind:'room',roomId:'r2'}])
    expect(es.map(e=>e.type)).toEqual(['arrival','room_change'])
    expect(es[1].from).toEqual({status:'in_room',roomId:'r1'})
    expect(stateFor(es,'e1',day).firstArrival).toBe(time)
  })
  it('сохраняет временное убытие и возвращение', () => {
    const es = sequence([{kind:'room',roomId:'r1'},{kind:'temporary_departure'},{kind:'room',roomId:'r2'}])
    expect(es.map(e=>e.type)).toEqual(['arrival','temporary_departure','return'])
    expect(es[1].to.status).toBe('away')
  })
  it('блокирует обычные действия после ухода, допускает явное возобновление', () => {
    const es = sequence([{kind:'room',roomId:'r1'},{kind:'departure'}])
    expect(()=>createEvent('e1',es,{kind:'room',roomId:'r2'},time+3000,'x')).toThrow()
    const reopened = createEvent('e1',es,{kind:'reopen',roomId:'r2'},time+4000,'x')!
    expect(reopened.type).toBe('reopen')
    expect(stateFor([...es,reopened],'e1',day).departure).toBeUndefined()
  })
  it('отмена последнего события восстанавливает состояние', () => {
    const es = sequence([{kind:'room',roomId:'r1'},{kind:'temporary_departure'}])
    expect(stateFor(es.slice(0,-1),'e1',day).location).toEqual({status:'in_room',roomId:'r1'})
  })
  it('начинает новый день без изменения истории предыдущего', () => {
    const es=sequence([{kind:'room',roomId:'r1'}])
    expect(stateFor(es,'e1','2026-11-14').location.status).toBe('not_arrived')
    expect(stateFor(es,'e1',day).location.status).toBe('in_room')
    expect(stateFor(es,'other',day).location.status).toBe('not_arrived')
  })
  it('запрещает убытие до прибытия и некорректное возобновление', () => {
    expect(()=>sequence([{kind:'departure'}])).toThrow()
    expect(()=>sequence([{kind:'reopen',roomId:'r1'}])).toThrow()
  })
  it('упорядочивает события даже при переводе часов назад', () => {
    const es=sequence([{kind:'room',roomId:'r1'}])
    const e=createEvent('e1',es,{kind:'room',roomId:'r2'},time-1000,'next')!
    expect(e.timestamp).toBe(time-1000)
    expect(e.sequence).toBe(2)
    expect(stateFor([e,...es],'e1',day).location).toEqual({status:'in_room',roomId:'r2'})
  })
})
