<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useTracker } from './composables/useTracker'
import type { Action, Location } from './domain/types'
import EmployeeList from './components/EmployeeList.vue'
import MovementPanel from './components/MovementPanel.vue'
import SettingsView from './components/SettingsView.vue'
import EventJournal from './components/EventJournal.vue'
const {employees,rooms,events,today,date,error,ready,busy,notice,dayEvents,states,roomName,employeeName,act,undo,save,archive,move,theme,setTheme,download,restore}=useTracker()
const page=ref<'tracking'|'journal'|'settings'>('tracking'), view=ref<'people'|'rooms'>('people'), query=ref(''), filter=ref('all'), sort=ref('order'), selected=ref<string>(), online=ref(navigator.onLine)
const {needRefresh,offlineReady,updateServiceWorker}=useRegisterSW({onRegisterError(e){error.value=`Не удалось подготовить офлайн-режим: ${String(e)}`}})
const readonly=computed(()=>date.value!==today.value)
const active=computed(()=>employees.value.filter(e=>!e.archived||(readonly.value&&dayEvents.value.some(x=>x.employeeId===e.id))))
const counts=computed(()=>{const result={in_room:0,away:0,not_arrived:0,finished:0};active.value.forEach(e=>result[states.value.get(e.id)!.location.status]++);return result})
const filtered=computed(()=>{const list=active.value.filter(e=>e.name.toLocaleLowerCase('ru').includes(query.value.trim().toLocaleLowerCase('ru'))&&(filter.value==='all'||states.value.get(e.id)?.location.status===filter.value));if(sort.value==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'ru'));if(sort.value==='recent')list.sort((a,b)=>(states.value.get(b.id)?.lastChange??0)-(states.value.get(a.id)?.lastChange??0));return list})
const selectedEmployee=computed(()=>employees.value.find(e=>e.id===selected.value))
const selectedEvents=computed(()=>dayEvents.value.filter(e=>e.employeeId===selected.value))
const visibleRooms=computed(()=>rooms.value.filter(r=>!r.archived||filtered.value.some(e=>{const l=states.value.get(e.id)!.location;return l.status==='in_room'&&l.roomId===r.id})))
function occupants(id:string){return filtered.value.filter(e=>{const l:Location=states.value.get(e.id)!.location;return l.status==='in_room'&&l.roomId===id})}
const journal=computed(()=>dayEvents.value.filter(e=>employeeName(e.employeeId).toLocaleLowerCase('ru').includes(query.value.trim().toLocaleLowerCase('ru'))))
async function action(a:Action){if(selected.value&&await act(selected.value,a))selected.value=undefined}
async function undoSelected(){if(selected.value&&await undo(selected.value))selected.value=undefined}
watch(date,()=>{selected.value=undefined})
watch(theme,value=>{document.documentElement.dataset.theme=value},{immediate:true})
let noticeTimer:ReturnType<typeof setTimeout>;watch(notice,()=>{clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.value='',4000)})
function network(){online.value=navigator.onLine}
onMounted(()=>{window.addEventListener('online',network);window.addEventListener('offline',network)})
onBeforeUnmount(()=>{window.removeEventListener('online',network);window.removeEventListener('offline',network);clearTimeout(noticeTimer)})
</script>
<template>
  <div class="app-shell"><aside class="sidebar"><a class="brand" href="#" @click.prevent="page='tracking'"><span class="brand-mark">↗</span><span>Учёт<br>перемещений</span></a><p class="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</p><nav aria-label="Основная навигация"><button :class="{active:page==='tracking'}" @click="page='tracking';query=''">▦ <span>Местонахождение</span></button><button :class="{active:page==='journal'}" @click="page='journal';query=''">◷ <span>Журнал событий</span></button><button :class="{active:page==='settings'}" @click="page='settings'">⚙ <span>Настройки</span></button></nav><div class="sidebar-bottom"><span class="local-dot"></span><div>Данные на устройстве<small>Без аккаунта и сервера</small></div></div></aside>
  <div class="workspace"><header class="topbar"><span>Офис / {{page==='settings'?'Настройки':page==='journal'?'Журнал':'Местонахождение'}}</span><span class="connection"><i :class="online?'local-dot':'offline-dot'"></i>{{online?'Локальное хранение':'Офлайн-режим'}}</span></header>
  <main><div class="page-heading"><div><p class="eyebrow">{{page==='settings'?'ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО':'ВСЁ ПОД КОНТРОЛЕМ'}}</p><h1>{{page==='settings'?'Настройки':page==='journal'?'Журнал событий':'Кто где сейчас'}}</h1><p class="subtitle">{{page==='settings'?'Справочники, оформление и сохранность данных.':page==='journal'?'Все перемещения за выбранный день.':'Местонахождение сотрудников в течение рабочего дня.'}}</p></div><label v-if="page!=='settings'" class="date-control"><span>{{readonly?'Просмотр истории':'Сегодня'}}</span><input v-model="date" type="date" :max="today" aria-label="Дата учёта"></label></div>
  <div v-if="error" class="error-banner" role="alert"><span>{{error}}</span><button class="icon-button" aria-label="Скрыть ошибку" @click="error=''">×</button></div>
  <div v-if="needRefresh" class="info-banner"><span>Доступна новая версия приложения.</span><button :disabled="busy" @click="updateServiceWorker(true)">Обновить</button><button class="text-button" @click="needRefresh=false">Позже</button></div>
  <div v-if="offlineReady" class="info-banner"><span>Приложение готово к работе без интернета.</span><button class="text-button" @click="offlineReady=false">Понятно</button></div>
  <p v-if="!ready" class="empty-small">Открываем локальную базу…</p>
  <SettingsView v-else-if="page==='settings'" :employees="employees" :rooms="rooms" :theme="theme" :busy="busy" @save="save" @archive="archive" @move="move" @theme="setTheme" @download="download" @restore="restore"/>
  <template v-else>
    <div v-if="readonly" class="history-banner">История за {{date.split('-').reverse().join('.')}} · только просмотр <button class="text-button" @click="date=today">Вернуться к сегодня</button></div>
    <div v-if="page==='tracking'" class="stats-grid"><button :class="{chosen:filter==='in_room'}" @click="filter=filter==='in_room'?'all':'in_room'"><span class="stat-symbol green">▦</span><span><b>{{counts.in_room}}</b><small>В офисе</small></span><i class="status-dot in_room"></i></button><button :class="{chosen:filter==='away'}" @click="filter=filter==='away'?'all':'away'"><span class="stat-symbol amber">↗</span><span><b>{{counts.away}}</b><small>Убыли временно</small></span></button><button :class="{chosen:filter==='not_arrived'}" @click="filter=filter==='not_arrived'?'all':'not_arrived'"><span class="stat-symbol gray">◷</span><span><b>{{counts.not_arrived}}</b><small>Не прибыли</small></span></button><button :class="{chosen:filter==='finished'}" @click="filter=filter==='finished'?'all':'finished'"><span class="stat-symbol blue">✓</span><span><b>{{counts.finished}}</b><small>Завершили день</small></span></button></div>
    <section class="tracking-card"><div class="card-toolbar"><div v-if="page==='tracking'" class="segmented"><button :class="{active:view==='people'}" @click="view='people'">☷ Люди <span>{{active.length}}</span></button><button :class="{active:view==='rooms'}" @click="view='rooms'">▦ Кабинеты</button></div><h2 v-else>Хронология <span class="count">{{journal.length}}</span></h2><label class="search"><span aria-hidden="true">⌕</span><input v-model="query" type="search" placeholder="Найти сотрудника…" aria-label="Поиск сотрудника"></label></div>
    <div v-if="page==='tracking'&&active.length" class="filter-toolbar"><label>Статус <select v-model="filter" aria-label="Фильтр по состоянию"><option value="all">Все сотрудники</option><option value="in_room">В офисе</option><option value="away">Убыли</option><option value="not_arrived">Не прибыли</option><option value="finished">Завершили день</option></select></label><label>Порядок <select v-model="sort" aria-label="Сортировка"><option value="order">Как в справочнике</option><option value="name">По имени</option><option value="recent">По последней отметке</option></select></label></div>
    <div v-if="!employees.length" class="empty-state"><span class="empty-icon">♧</span><h2>Начнём с вашей команды</h2><p>Добавьте сотрудников и кабинеты.<br>Затем отмечайте перемещения всего в два нажатия.</p><button class="primary" @click="page='settings'">Добавить первые записи →</button></div>
    <EventJournal v-else-if="page==='journal'" :events="journal" :room-name="roomName" :employee-name="employeeName"/>
    <template v-else-if="view==='people'"><EmployeeList v-if="filtered.length" :employees="filtered" :states="states" :room-name="roomName" :readonly="readonly" @select="selected=$event"/><div v-else class="empty-state"><h2>Сотрудники не найдены</h2><p>Измените поиск или фильтр. Архив доступен в настройках.</p><button @click="query='';filter='all'">Сбросить фильтры</button></div></template>
    <div v-else class="rooms-grid"><article v-for="room in visibleRooms" :key="room.id" class="room-card"><header><h3>{{room.name}} <small v-if="room.archived">· архив</small></h3><span class="count">{{occupants(room.id).length}}</span></header><button v-for="employee in occupants(room.id)" :key="employee.id" class="occupant" @click="selected=employee.id"><i class="status-dot in_room"></i>{{employee.name}}<span>›</span></button><p v-if="!occupants(room.id).length" class="muted">Никого нет</p></article><p v-if="!visibleRooms.length" class="empty-small">Кабинетов пока нет. Добавьте их в настройках.</p><p class="room-footnote">В кабинетах показаны только сотрудники со статусом «В офисе», с учётом поиска и фильтра.</p></div>
    <footer v-if="page==='tracking'&&employees.length" class="list-footer"><span>{{filtered.length}} из {{active.length}} сотрудников</span><span>{{readonly?'История сохранена':'Нажмите на сотрудника, чтобы изменить отметку'}}</span></footer>
    </section>
    <p class="privacy-note">⌁ Все изменения сохраняются автоматически на этом устройстве</p>
  </template>
  </main><footer class="app-footer">Учёт перемещений <span>Ваш офис. Ваши данные.</span></footer></div>
  <MovementPanel v-if="selectedEmployee" :key="selectedEmployee.id" :employee="selectedEmployee" :state="states.get(selectedEmployee.id)!" :rooms="rooms" :events="selectedEvents" :room-name="roomName" :employee-name="employeeName" :readonly="readonly" :busy="busy" @close="selected=undefined" @action="action" @undo="undoSelected"/>
  <div v-if="notice" role="status" class="toast">✓ {{notice}}</div>
  </div>
</template>
