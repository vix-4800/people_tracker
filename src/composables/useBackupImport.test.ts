import { expect, it } from 'vitest'
import { useBackupImport } from './useBackupImport'
const backup={format:'office-movements',version:1,exportedAt:'2026-11-13T10:00:00Z',employees:[],rooms:[],movementEvents:[],settings:[]}
it('сбрасывает старое подтверждение сразу при выборе нового файла и после ошибки',async()=>{
  const state=useBackupImport()
  await state.read({size:10,text:async()=>JSON.stringify(backup)})
  expect(state.pending.value).toBeDefined()
  let resolve!:(text:string)=>void
  const job=state.read({size:10,text:()=>new Promise(r=>{resolve=r})})
  expect(state.pending.value).toBeUndefined()
  expect(state.importing.value).toBe(true)
  resolve('{broken');await job
  expect(state.pending.value).toBeUndefined()
  expect(state.fileError.value).not.toBe('')
})
it('отклоняет слишком большой файл до чтения',async()=>{
  const state=useBackupImport();let read=false
  await state.read({size:26*1024*1024,text:async()=>{read=true;return ''}})
  expect(read).toBe(false);expect(state.pending.value).toBeUndefined();expect(state.fileError.value).toContain('25 МБ')
})
