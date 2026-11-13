<script setup lang="ts">
import { ref } from 'vue'
import type { Backup, DirectoryEntry } from '../domain/types'
import type { Directory } from '../data/database'
import { useBackupImport } from '../composables/useBackupImport'
import DirectoryEditor from './DirectoryEditor.vue'
defineProps<{employees:DirectoryEntry[];rooms:DirectoryEntry[];theme:string;busy:boolean}>()
const emit=defineEmits<{save:[table:Directory,name:string,id?:string];archive:[table:Directory,entry:DirectoryEntry];move:[table:Directory,id:string,direction:number];theme:[value:string];download:[];restore:[backup:Backup]}>()
const {pending,fileError,importing,read}=useBackupImport()
const storage=ref('')
async function readFile(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;await read(file);input.value=''}
async function persist(){try{if(!navigator.storage?.persist){storage.value='Браузер не поддерживает запрос постоянного хранения.';return}const ok=await navigator.storage.persist();storage.value=ok?'Постоянное хранение разрешено. Продолжайте делать резервные копии.':'Браузер не разрешил постоянное хранение. Приложение продолжит работать; сохраняйте резервные копии.'}catch{storage.value='Не удалось запросить хранение. Приложение продолжит работать.'}}
</script>
<template>
  <div class="settings-grid"><DirectoryEditor title="Сотрудники" :entries="employees" :busy="busy" placeholder="Фамилия и имя" @save="(name,id)=>emit('save','employees',name,id)" @archive="emit('archive','employees',$event)" @move="(id,d)=>emit('move','employees',id,d)"/>
  <DirectoryEditor title="Кабинеты" :entries="rooms" :busy="busy" placeholder="Название кабинета" @save="(name,id)=>emit('save','rooms',name,id)" @archive="emit('archive','rooms',$event)" @move="(id,d)=>emit('move','rooms',id,d)"/>
  <section class="settings-card"><h2>Оформление</h2><label class="field-label" for="theme">Тема приложения</label><select id="theme" :value="theme" @change="emit('theme',($event.target as HTMLSelectElement).value)"><option value="system">Как на устройстве</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select></section>
  <section class="settings-card"><h2>Резервные копии</h2><p class="muted">Данные находятся только в этом браузере. Сохраните копию перед очисткой браузера или переносом на другое устройство.</p><div class="backup-actions"><button class="primary" :disabled="busy" @click="emit('download')">↓ Экспортировать JSON</button><label class="file-button" :class="{disabled:busy||importing}">↑ Восстановить из файла<input type="file" accept="application/json,.json" :disabled="busy||importing" @change="readFile"></label></div><p v-if="fileError" role="alert" class="error-inline">{{fileError}}</p>
  <div v-if="pending" class="import-confirm" role="alert"><h3>Заменить все данные?</h3><p>В копии: сотрудников — {{pending.employees.length}}, кабинетов — {{pending.rooms.length}}, событий — {{pending.movementEvents.length}}. Текущая база будет полностью заменена.</p><button class="text-button" :disabled="busy" @click="emit('download')">Сначала скачать текущую базу</button><div class="backup-actions"><button class="danger" :disabled="busy" @click="emit('restore',pending);pending=undefined">Заменить данные</button><button :disabled="busy" @click="pending=undefined">Отмена</button></div></div>
  </section>
  <section class="settings-card"><h2>Хранение на устройстве</h2><p class="muted">Попросите браузер защитить данные от автоматического удаления при нехватке места. Это не заменяет резервную копию.</p><button @click="persist">Запросить постоянное хранение</button><p v-if="storage" role="status" class="muted">{{storage}}</p></section>
  <section class="settings-card"><h2>О приложении</h2><p class="muted">Учёт перемещений · версия 1.0<br>Без сервера, аккаунтов и телеметрии. Между устройствами данные переносятся резервной копией.</p></section></div>
</template>
