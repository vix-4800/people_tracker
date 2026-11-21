<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DirectoryEntry, Employee } from '../domain/types'
const props=defineProps<{
  title:string
  entries:Employee[]
  rooms?:DirectoryEntry[]
  busy:boolean
  placeholder:string
  save:(name:string,id?:string,homeRoomId?:string|null)=>Promise<boolean>
}>()
const emit=defineEmits<{archive:[entry:DirectoryEntry];move:[id:string,direction:number]}>()
const name=ref(''), editing=ref<string>(), showArchive=ref(false)
const homeRoomId=ref<string|null>(null)
const roomOptions=computed(()=>props.rooms?.filter(room=>!room.archived||room.id===homeRoomId.value))
const roomsById=computed(()=>new Map(props.rooms?.map(room=>[room.id,room])))

function reset(){name.value='';editing.value=undefined;homeRoomId.value=null}
async function submit(){
  if(!name.value.trim()||props.busy)return
  if(await props.save(name.value.trim(),editing.value,props.rooms?homeRoomId.value:undefined))reset()
}
function edit(entry:Employee){editing.value=entry.id;name.value=entry.name;homeRoomId.value=entry.homeRoomId??null}
</script>
<template>
  <section class="settings-card"><div class="section-line"><h2>{{title}}</h2><span class="count">{{entries.filter(e=>!e.archived).length}}</span></div>
  <form class="add-form" @submit.prevent="submit">
    <label class="sr-only" :for="title">{{placeholder}}</label>
    <input :id="title" v-model="name" :placeholder="placeholder" maxlength="120" :disabled="busy" required>
    <label v-if="rooms" class="home-room-field">
      Личный кабинет
      <select v-model="homeRoomId" :disabled="busy">
        <option :value="null">Без назначения</option>
        <option v-for="room in roomOptions" :key="room.id" :value="room.id" :disabled="room.archived">{{room.name}}{{room.archived?' (архив)':''}}</option>
      </select>
    </label>
    <button class="primary" :disabled="busy">{{editing?'Сохранить':'Добавить'}}</button>
    <button v-if="editing" type="button" class="text-button" :disabled="busy" @click="reset">Отмена</button>
  </form>
  <label class="checkbox-label"><input v-model="showArchive" type="checkbox"> Показывать архив</label>
  <p v-if="!entries.length" class="empty-small">Справочник пока пуст. Добавьте первую запись.</p>
  <div v-for="entry in entries.filter(e=>showArchive||!e.archived)" :key="entry.id" class="directory-row">
    <span>{{entry.name}}
      <small v-if="entry.archived">В архиве</small>
      <small v-if="entry.homeRoomId">
        Личный кабинет · {{roomsById.get(entry.homeRoomId)?.name}}{{roomsById.get(entry.homeRoomId)?.archived?' (архив)':''}}
      </small>
    </span>
    <div class="directory-actions"><button class="icon-button" :disabled="busy||entries.findIndex(e=>e.id===entry.id)===0" :aria-label="`Выше: ${entry.name}`" @click="emit('move',entry.id,-1)">↑</button><button class="icon-button" :disabled="busy||entries.findIndex(e=>e.id===entry.id)===entries.length-1" :aria-label="`Ниже: ${entry.name}`" @click="emit('move',entry.id,1)">↓</button><button class="text-button" :disabled="busy" @click="edit(entry)">Изменить</button><button class="text-button" :disabled="busy" @click="emit('archive',entry)">{{entry.archived?'Восстановить':'В архив'}}</button></div>
  </div>
  </section>
</template>
<style scoped>
.home-room-field {
  flex-basis: 100%;
  min-width: 0;
  color: var(--muted);
  font-size: 12px;
}
.home-room-field select {
  display: block;
  width: 100%;
  margin-top: 6px;
}
</style>
