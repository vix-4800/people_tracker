import { ref } from 'vue'
import type { Backup } from '../domain/types'
import { validateBackup } from '../data/backup'
export function useBackupImport() {
  const pending=ref<Backup>(),fileError=ref(''),importing=ref(false)
  async function read(file:Pick<File,'size'|'text'>) {
    pending.value=undefined;fileError.value='';importing.value=true
    try {if(file.size>25*1024*1024)throw new Error('Максимальный размер копии — 25 МБ');pending.value=validateBackup(JSON.parse(await file.text()))}
    catch(e){fileError.value=e instanceof Error?e.message:'Не удалось прочитать файл'}
    finally{importing.value=false}
  }
  return {pending,fileError,importing,read}
}
