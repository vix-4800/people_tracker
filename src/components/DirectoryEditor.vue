<script setup lang="ts">
import { ref } from 'vue'
import type { DirectoryEntry } from '../domain/types'
defineProps<{title:string;entries:DirectoryEntry[];busy:boolean;placeholder:string}>()
const emit=defineEmits<{save:[name:string,id?:string];archive:[entry:DirectoryEntry];move:[id:string,direction:number]}>()
const name=ref(''), editing=ref<string>(), showArchive=ref(false)
function submit(){if(!name.value.trim())return;emit('save',name.value.trim(),editing.value);name.value='';editing.value=undefined}
function edit(entry:DirectoryEntry){editing.value=entry.id;name.value=entry.name}
</script>
<template>
  <section class="settings-card"><div class="section-line"><h2>{{title}}</h2><span class="count">{{entries.filter(e=>!e.archived).length}}</span></div>
  <form class="add-form" @submit.prevent="submit"><label class="sr-only" :for="title">{{placeholder}}</label><input :id="title" v-model="name" :placeholder="placeholder" maxlength="120" required><button class="primary" :disabled="busy">{{editing?'Сохранить':'Добавить'}}</button><button v-if="editing" type="button" class="text-button" @click="editing=undefined;name=''">Отмена</button></form>
  <label class="checkbox-label"><input v-model="showArchive" type="checkbox"> Показывать архив</label>
  <p v-if="!entries.length" class="empty-small">Справочник пока пуст. Добавьте первую запись.</p>
  <div v-for="(entry,index) in entries.filter(e=>showArchive||!e.archived)" :key="entry.id" class="directory-row"><span>{{entry.name}}<small v-if="entry.archived">В архиве</small></span><div class="directory-actions"><button class="icon-button" :disabled="busy||entries.findIndex(e=>e.id===entry.id)===0" :aria-label="`Выше: ${entry.name}`" @click="emit('move',entry.id,-1)">↑</button><button class="icon-button" :disabled="busy||entries.findIndex(e=>e.id===entry.id)===entries.length-1" :aria-label="`Ниже: ${entry.name}`" @click="emit('move',entry.id,1)">↓</button><button class="text-button" :disabled="busy" @click="edit(entry)">Изменить</button><button class="text-button" :disabled="busy" @click="emit('archive',entry)">{{entry.archived?'Восстановить':'В архив'}}</button></div></div>
  </section>
</template>
