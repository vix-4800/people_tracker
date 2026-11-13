import Dexie, { type Table } from 'dexie'
import type { Action, Backup, DirectoryEntry, MovementEvent, Setting } from '../domain/types'
import { createEvent, localDay } from '../domain/movements'
import { validateBackup } from './backup'
export class TrackerDB extends Dexie {
  employees!: Table<DirectoryEntry,string>; rooms!: Table<DirectoryEntry,string>; movementEvents!: Table<MovementEvent,string>; settings!: Table<Setting,string>
  constructor(name='office-movements') { super(name); this.version(1).stores({employees:'id',rooms:'id',movementEvents:'id, employeeId, day',settings:'key'}); this.version(2).stores({employees:'id, order',rooms:'id, order',movementEvents:'id, employeeId, day, [employeeId+day]',settings:'key'}).upgrade(async tx=>{ for(const table of ['employees','rooms']) { let order=0; await tx.table(table).toCollection().modify(e=>{e.order=order++}) } }) }
}
export type Directory = 'employees' | 'rooms'
export async function saveEntry(db:TrackerDB,table:Directory,name:string,id?:string):Promise<DirectoryEntry> {
  name=name.trim();if(!name||name.length>120)throw new Error('Введите название длиной от 1 до 120 символов')
  return db.transaction('rw',db[table],async()=>{const old=id?await db[table].get(id):undefined;if(id&&!old)throw new Error('Запись больше не существует');const last=await db[table].orderBy('order').last();const entry:DirectoryEntry={id:id??crypto.randomUUID(),name,archived:old?.archived??false,order:old?.order??(last?.order??-1)+1};await db[table].put(entry);return entry})
}
export async function recordMovement(db:TrackerDB,employeeId:string,action:Action):Promise<void> {
  await db.transaction('rw',db.employees,db.rooms,db.movementEvents,async()=>{
    const employee=await db.employees.get(employeeId);if(!employee||employee.archived)throw new Error('Сотрудник отсутствует или находится в архиве')
    if('roomId' in action){const room=await db.rooms.get(action.roomId);if(!room||room.archived)throw new Error('Кабинет отсутствует или находится в архиве')}
    const timestamp=Date.now(),day=localDay(new Date(timestamp)),events=await db.movementEvents.where('day').equals(day).toArray()
    const event=createEvent(employeeId,events,action,timestamp,crypto.randomUUID());if(event)await db.movementEvents.add(event)
  })
}
export async function undoLast(db:TrackerDB,employeeId:string):Promise<void> {
  await db.transaction('rw',db.movementEvents,async()=>{const events=await db.movementEvents.where('[employeeId+day]').equals([employeeId,localDay()]).toArray();const last=events.sort((a,b)=>b.sequence-a.sequence)[0];if(last)await db.movementEvents.delete(last.id)})
}
export async function reorderEntries(db:TrackerDB,table:Directory,ids:string[]):Promise<void> {
  await db.transaction('rw',db[table],async()=>{const current=await db[table].toArray();if(ids.length!==current.length||new Set(ids).size!==ids.length||current.some(e=>!ids.includes(e.id)))throw new Error('Справочник изменён в другой вкладке. Повторите действие');for(const [order,id] of ids.entries())await db[table].update(id,{order})})
}
export async function exportBackup(db:TrackerDB):Promise<Backup> {
  return db.transaction('r',db.tables,async()=>({format:'office-movements',version:1,exportedAt:new Date().toISOString(),employees:await db.employees.orderBy('order').toArray(),rooms:await db.rooms.orderBy('order').toArray(),movementEvents:(await db.movementEvents.toArray()).sort((a,b)=>a.day.localeCompare(b.day)||a.sequence-b.sequence),settings:await db.settings.toArray()}))
}
export async function importBackup(db:TrackerDB,input:unknown):Promise<void> {
  const backup=validateBackup(input)
  await db.transaction('rw',db.tables,async()=>{await Promise.all(db.tables.map(t=>t.clear()));await db.employees.bulkAdd(backup.employees);await db.rooms.bulkAdd(backup.rooms);await db.movementEvents.bulkAdd(backup.movementEvents);await db.settings.bulkAdd(backup.settings)})
}
