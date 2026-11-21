import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { TrackerDB, recordMovement, undoLast, saveEntry, reorderEntries, exportBackup, importBackup } from './database'
import { validateBackup } from './backup'
const dbs: TrackerDB[]=[]
async function setup() {
  const db=new TrackerDB(`test-${crypto.randomUUID()}`); dbs.push(db)
  const e=await saveEntry(db,'employees','Иван Иванов')
  const r=await saveEntry(db,'rooms','Кабинет 9')
  return {db,e,r}
}
afterEach(async()=>{for(const db of dbs) await db.delete(); dbs.length=0})
describe('локальная база',()=>{
  it('сохраняет событие и отменяет его',async()=>{
    const {db,e,r}=await setup()
    await recordMovement(db,e.id,{kind:'room',roomId:r.id})
    expect(await db.movementEvents.count()).toBe(1)
    await undoLast(db,e.id)
    expect(await db.movementEvents.count()).toBe(0)
  })
  it('атомарно подавляет повторы из параллельных действий',async()=>{
    const {db,e,r}=await setup()
    await Promise.all([recordMovement(db,e.id,{kind:'room',roomId:r.id}),recordMovement(db,e.id,{kind:'room',roomId:r.id})])
    expect(await db.movementEvents.count()).toBe(1)
  })
  it('архив и переименование сохраняют историю и стабильные ID',async()=>{
    const {db,e,r}=await setup()
    await recordMovement(db,e.id,{kind:'room',roomId:r.id})
    await saveEntry(db,'employees','Новое имя',e.id)
    await db.rooms.update(r.id,{archived:true})
    expect((await db.movementEvents.toArray())[0].to).toEqual({status:'in_room',roomId:r.id})
    expect((await db.employees.get(e.id))?.name).toBe('Новое имя')
    await expect(recordMovement(db,e.id,{kind:'room',roomId:r.id})).rejects.toThrow()
  })
  it('сохраняет личный кабинет при переименовании и позволяет снять назначение',async()=>{
    const {db,e,r}=await setup()
    await saveEntry(db,'employees',e.name,e.id,r.id)
    await saveEntry(db,'employees','Новое имя',e.id)
    expect(await db.employees.get(e.id)).toMatchObject({name:'Новое имя',homeRoomId:r.id})
    await saveEntry(db,'employees','Новое имя',e.id,null)
    expect(await db.employees.get(e.id)).not.toHaveProperty('homeRoomId')
  })
  it('не назначает отсутствующий или архивный кабинет',async()=>{
    const {db,e,r}=await setup()
    await db.rooms.update(r.id,{archived:true})
    for(const roomId of [r.id,'missing']) {
      await expect(saveEntry(db,'employees','Новое имя',e.id,roomId)).rejects.toThrow()
    }
    expect(await db.employees.get(e.id)).toEqual(e)
  })
  it('восстанавливает полную копию, включая архив и настройки',async()=>{
    const {db,e,r}=await setup()
    await saveEntry(db,'employees',e.name,e.id,r.id)
    await recordMovement(db,e.id,{kind:'room',roomId:r.id})
    await db.employees.update(e.id,{archived:true})
    await db.rooms.update(r.id,{archived:true})
    await db.settings.put({key:'theme',value:'dark'})
    const backup=await exportBackup(db)
    await db.movementEvents.clear()
    await importBackup(db,backup)
    expect(await db.employees.get(e.id)).toMatchObject({homeRoomId:r.id})
    expect(await exportBackup(db)).toMatchObject({employees:backup.employees,rooms:backup.rooms,movementEvents:backup.movementEvents,settings:backup.settings})
  })
  it('отклоняет повреждённый импорт до изменения базы',async()=>{
    const {db}=await setup(); const backup=await exportBackup(db)
    await expect(importBackup(db,{...backup,version:99})).rejects.toThrow()
    expect(await db.employees.count()).toBe(1)
    expect(()=>validateBackup({...backup,employees:[...backup.employees,...backup.employees]})).toThrow()
    expect(()=>validateBackup({...backup,employees:[{...backup.employees[0],homeRoomId:'missing'}]})).toThrow()
    expect(()=>validateBackup({...backup,movementEvents:[{id:'bad'}]})).toThrow()
  })
  it('отклоняет нарушенные цепочки и несуществующие ссылки',async()=>{
    const {db,e,r}=await setup(); await recordMovement(db,e.id,{kind:'room',roomId:r.id})
    const b=await exportBackup(db)
    expect(()=>validateBackup({...b,rooms:[]})).toThrow()
    expect(()=>validateBackup({...b,movementEvents:b.movementEvents.map(x=>({...x,from:{status:'away'}}))})).toThrow()
  })
  it('меняет порядок справочника атомарно',async()=>{
    const {db,e}=await setup(); const e2=await saveEntry(db,'employees','Анна')
    await reorderEntries(db,'employees',[e2.id,e.id])
    expect((await db.employees.orderBy('order').toArray()).map(x=>x.id)).toEqual([e2.id,e.id])
  })
  it('мигрирует справочник v1 без потери событий',async()=>{
    const {default:Dexie}=await import('dexie'); const name=`migration-${crypto.randomUUID()}`
    const old=new Dexie(name); old.version(1).stores({employees:'id',rooms:'id',movementEvents:'id, employeeId, day',settings:'key'})
    await old.table('employees').add({id:'e',name:'Сотрудник',archived:false}); old.close()
    const current=new TrackerDB(name); dbs.push(current)
    expect((await current.employees.get('e'))?.order).toBe(0)
  })
})
