import type { Action, EmployeeState, MovementEvent, Location, EventType } from './types'
export function localDay(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function stateFor(events: MovementEvent[], employeeId: string, day: string): EmployeeState {
  const result:EmployeeState={location:{status:'not_arrived'}}
  for(const e of events.filter(e=>e.employeeId===employeeId&&e.day===day).sort((a,b)=>a.sequence-b.sequence)) {
    result.location=e.to;result.lastChange=e.timestamp
    if(e.type==='arrival')result.firstArrival=e.timestamp
    if(e.type==='departure')result.departure=e.timestamp
    if(e.type==='reopen')result.departure=undefined
  }
  return result
}
export function transition(from:Location,action:Action):{type:EventType;to:Location}|null {
  if(action.kind==='reopen') {if(from.status!=='finished')throw new Error('Возобновление доступно только после завершения дня');return {type:'reopen',to:{status:'in_room',roomId:action.roomId}}}
  if(from.status==='finished')throw new Error('Сначала явно возобновите рабочий день')
  if(action.kind==='room') {
    if(!action.roomId)throw new Error('Выберите кабинет')
    if(from.status==='in_room'&&from.roomId===action.roomId)return null
    return {type:from.status==='not_arrived'?'arrival':from.status==='away'?'return':'room_change',to:{status:'in_room',roomId:action.roomId}}
  }
  if(from.status==='not_arrived')throw new Error('Сначала отметьте прибытие в кабинет')
  if(action.kind==='temporary_departure'){if(from.status==='away')return null;return {type:'temporary_departure',to:{status:'away'}}}
  return {type:'departure',to:{status:'finished'}}
}
export function createEvent(employeeId:string,events:MovementEvent[],action:Action,timestamp:number,id:string):MovementEvent|null {
  const day=localDay(new Date(timestamp)), from=stateFor(events,employeeId,day).location
  const result=transition(from,action);if(!result)return null
  return {id,employeeId,day,timestamp,sequence:Math.max(0,...events.filter(e=>e.day===day).map(e=>e.sequence))+1,from,...result}
}
