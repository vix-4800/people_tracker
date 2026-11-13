import { computed, onScopeDispose, ref } from 'vue'
import { liveQuery } from 'dexie'
import { TrackerDB, exportBackup, importBackup, recordMovement, reorderEntries, saveEntry, undoLast, type Directory } from '../data/database'
import { localDay, stateFor } from '../domain/movements'
import type { Action, Backup, DirectoryEntry, MovementEvent, Setting } from '../domain/types'
export const db = new TrackerDB()
export function useTracker() {
  const employees=ref<DirectoryEntry[]>([]), rooms=ref<DirectoryEntry[]>([]), events=ref<MovementEvent[]>([]), settings=ref<Setting[]>([])
  const today=ref(localDay()), date=ref(today.value), error=ref(''), ready=ref(false), busy=ref(false), notice=ref('')
  const subscription=liveQuery(()=>db.transaction('r',db.tables,async()=>({employees:await db.employees.orderBy('order').toArray(),rooms:await db.rooms.orderBy('order').toArray(),events:await db.movementEvents.toArray(),settings:await db.settings.toArray()}))).subscribe({next:data=>{employees.value=data.employees;rooms.value=data.rooms;events.value=data.events;settings.value=data.settings;ready.value=true},error:e=>{error.value=`Не удалось открыть локальную базу: ${String(e)}. Проверьте разрешения браузера и свободное место.`;ready.value=true}})
  function tick() { const next=localDay(); if(next!==today.value) {if(date.value===today.value) date.value=next; today.value=next} }
  const interval=setInterval(tick,1000); window.addEventListener('focus',tick); document.addEventListener('visibilitychange',tick)
  onScopeDispose(()=>{subscription.unsubscribe(); clearInterval(interval); window.removeEventListener('focus',tick); document.removeEventListener('visibilitychange',tick)})
  const dayEvents=computed(()=>events.value.filter(e=>e.day===date.value).sort((a,b)=>a.sequence-b.sequence))
  const states=computed(()=>new Map(employees.value.map(e=>[e.id,stateFor(dayEvents.value,e.id,date.value)])))
  const roomName=(id:string)=>rooms.value.find(r=>r.id===id)?.name??'Неизвестный кабинет'
  const employeeName=(id:string)=>employees.value.find(e=>e.id===id)?.name??'Неизвестный сотрудник'
  async function run(task:()=>Promise<unknown>,message='') { if(busy.value) return false; busy.value=true; error.value=''; try {await task(); notice.value=message; return true} catch(e) {error.value=e instanceof Error?e.message:'Не удалось сохранить данные'; return false} finally {busy.value=false} }
  async function act(id:string,action:Action) {tick(); if(date.value!==today.value){error.value='Прошлые дни доступны только для просмотра';return false} return run(()=>recordMovement(db,id,action),'Отметка сохранена')}
  async function undo(id:string) { tick(); if(date.value!==today.value)return false; return run(()=>undoLast(db,id),'Последнее действие отменено') }
  const save=(table:Directory,name:string,id?:string)=>run(()=>saveEntry(db,table,name,id),'Сохранено')
  const archive=(table:Directory,entry:DirectoryEntry)=>run(()=>db[table].update(entry.id,{archived:!entry.archived}),'Сохранено')
  async function move(table:Directory,id:string,direction:number) { const list=[...(table==='employees'?employees.value:rooms.value)]; const i=list.findIndex(x=>x.id===id); const j=i+direction; if(i<0||j<0||j>=list.length)return; [list[i],list[j]]=[list[j],list[i]]; await run(()=>reorderEntries(db,table,list.map(x=>x.id))) }
  const theme=computed(()=>settings.value.find(s=>s.key==='theme')?.value??'system')
  const setTheme=(value:string)=>run(()=>db.settings.put({key:'theme',value}))
  async function download() {await run(async()=>{const backup=await exportBackup(db); const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})); const link=document.createElement('a'); link.href=url;link.download=`перемещения-${today.value}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)},'Резервная копия подготовлена')}
  const restore=(backup:Backup)=>run(()=>importBackup(db,backup),'Резервная копия восстановлена')
  return {employees,rooms,events,settings,today,date,error,ready,busy,notice,dayEvents,states,roomName,employeeName,act,undo,save,archive,move,theme,setTheme,download,restore}
}
export type Tracker = ReturnType<typeof useTracker>
