import type { Action, Backup, DirectoryEntry, Employee, Location, MovementEvent, Setting } from '../domain/types'
import { transition } from '../domain/movements'
function fail():never {throw new Error('Некорректная резервная копия: проверьте формат, ссылки и последовательность событий')}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))return fail();return value as Record<string,unknown>}
function text(value:unknown,max=120):string{if(typeof value!=='string'||!value.trim()||value.length>max)return fail();return value}
function array(value:unknown):unknown[]{if(!Array.isArray(value)||value.length>500000)return fail();return value}
function integer(value:unknown):number{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return fail();return value}
function unique(ids:string[]){if(new Set(ids).size!==ids.length)fail()}
function directoryEntry(e:Record<string,unknown>):DirectoryEntry {
  if(typeof e.archived!=='boolean')return fail()
  return {id:text(e.id,200),name:text(e.name),archived:e.archived,order:integer(e.order)}
}
function location(value:unknown,rooms:Set<string>):Location{const l=object(value);if(l.status==='in_room'){const roomId=text(l.roomId,200);if(!rooms.has(roomId))fail();return {status:'in_room',roomId}}if(l.status==='not_arrived'||l.status==='away'||l.status==='finished')return {status:l.status};return fail()}
function same(a:Location,b:Location){return a.status===b.status&&(a.status!=='in_room'||(b.status==='in_room'&&a.roomId===b.roomId))}
export function validateBackup(input:unknown):Backup {
  const b=object(input);if(b.format!=='office-movements'||b.version!==1)throw new Error('Неподдерживаемый формат или версия резервной копии')
  const exportedAt=text(b.exportedAt,50);if(!Number.isFinite(Date.parse(exportedAt)))fail()
  const rooms=array(b.rooms).map(item=>directoryEntry(object(item)))
  unique(rooms.map(room=>room.id))
  const roomIds=new Set(rooms.map(room=>room.id))
  const employees=array(b.employees).map(item=>{
    const entry=object(item)
    const employee:Employee=directoryEntry(entry)
    if(entry.homeRoomId!==undefined) {
      const roomId=text(entry.homeRoomId,200)
      if(!roomIds.has(roomId))fail()
      employee.homeRoomId=roomId
    }
    return employee
  })
  unique(employees.map(employee=>employee.id))
  const employeeIds=new Set(employees.map(employee=>employee.id))
  const movementEvents:MovementEvent[]=array(b.movementEvents).map(item=>{
    const e=object(item),day=text(e.day,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(`${day}T12:00:00Z`).toISOString().slice(0,10)!==day)fail()
    const employeeId=text(e.employeeId,200);if(!employeeIds.has(employeeId))fail()
    const timestamp=integer(e.timestamp);if(timestamp>8640000000000000)fail()
    const sequence=integer(e.sequence);if(sequence<1)fail()
    const from=location(e.from,roomIds),to=location(e.to,roomIds)
    const type=text(e.type);if(!['arrival','room_change','temporary_departure','return','departure','reopen'].includes(type))fail()
    return {id:text(e.id,200),employeeId,day,timestamp,sequence,from,to,type:type as MovementEvent['type']}
  }).sort((a,b)=>a.day.localeCompare(b.day)||a.sequence-b.sequence)
  unique(movementEvents.map(x=>x.id));unique(movementEvents.map(x=>`${x.day}:${x.sequence}`))
  const states=new Map<string,Location>()
  for(const e of movementEvents){const key=`${e.employeeId.length}:${e.employeeId}:${e.day}`,from=states.get(key)??{status:'not_arrived'};if(!same(from,e.from))fail()
    let action:Action
    if(e.type==='temporary_departure')action={kind:'temporary_departure'}
    else if(e.type==='departure')action={kind:'departure'}
    else {if(e.to.status!=='in_room')return fail();action={kind:e.type==='reopen'?'reopen':'room',roomId:e.to.roomId}}
    const next=transition(from,action);if(!next||next.type!==e.type||!same(next.to,e.to))fail();states.set(key,e.to)
  }
  const settings:Setting[]=array(b.settings).map(item=>{const s=object(item),key=text(s.key,100),value=text(s.value,1000);if(key==='theme'&&!['system','light','dark'].includes(value))fail();return {key,value}});unique(settings.map(x=>x.key))
  return {format:'office-movements',version:1,exportedAt,employees,rooms,movementEvents,settings}
}
