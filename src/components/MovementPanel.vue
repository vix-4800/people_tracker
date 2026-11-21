<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { Action, DirectoryEntry, Employee, EmployeeState, MovementEvent } from '../domain/types'
import { locationName, time } from '../utils/format'
import EventJournal from './EventJournal.vue'
const props=defineProps<{employee:Employee;state:EmployeeState;rooms:DirectoryEntry[];events:MovementEvent[];roomName:(id:string)=>string;employeeName:(id:string)=>string;readonly:boolean;busy:boolean}>()
const emit=defineEmits<{close:[];action:[action:Action];undo:[]}>()
const dialog=ref<HTMLDialogElement>(); const reopening=ref(false)
const activeRooms=computed(()=>props.rooms.filter(room=>!room.archived))
const homeRoom=computed(()=>activeRooms.value.find(room=>room.id===props.employee.homeRoomId))
let previous:HTMLElement|null=null
onMounted(()=>{previous=document.activeElement as HTMLElement;dialog.value?.showModal()})
onBeforeUnmount(()=>previous?.focus())
function roomAction(roomId:string){emit('action',{kind:reopening.value?'reopen':'room',roomId})}
function isCurrentRoom(roomId:string){return props.state.location.status==='in_room'&&props.state.location.roomId===roomId}
</script>
<template>
  <dialog ref="dialog" class="movement-dialog" @cancel.prevent="emit('close')" @click="($event.target===dialog)&&emit('close')">
    <div class="dialog-inner"><div class="sheet-handle"></div><header class="dialog-header"><div><p class="eyebrow">КАРТОЧКА СОТРУДНИКА</p><h2>{{employee.name}}</h2></div><button class="icon-button" aria-label="Закрыть" @click="emit('close')">×</button></header>
    <p class="current-location"><i class="status-dot" :class="state.location.status"></i>{{locationName(state.location,roomName)}}</p>
    <div class="arrival-times"><span>Первое прибытие <b>{{time(state.firstArrival)}}</b></span><span>Уход <b>{{time(state.departure)}}</b></span></div>
    <template v-if="!readonly && !employee.archived">
      <div v-if="state.location.status==='finished'&&!reopening" class="finished-note"><p>Рабочий день завершён. Если сотрудник вернулся, возобновите день и выберите кабинет.</p><button class="primary" :disabled="busy" @click="reopening=true">Возобновить день</button></div>
      <template v-else><h3>{{reopening?'Куда вернулся сотрудник?':'Выберите местонахождение'}}</h3>
      <div class="room-buttons">
        <button v-if="homeRoom" class="home-room-button primary" :disabled="busy" :class="{selected:isCurrentRoom(homeRoom.id)}" @click="roomAction(homeRoom.id)">
          У себя <small>{{homeRoom.name}}</small><small v-if="isCurrentRoom(homeRoom.id)">Сейчас здесь</small>
        </button>
        <button v-for="room in activeRooms" :key="room.id" :disabled="busy" :class="{selected:isCurrentRoom(room.id)}" @click="roomAction(room.id)">
          {{room.name}}<small v-if="isCurrentRoom(room.id)">Сейчас здесь</small>
        </button>
      </div>
      <p v-if="!activeRooms.length" class="empty-small">Добавьте кабинет в настройках.</p>
      <div v-if="!reopening" class="departure-buttons"><button :disabled="busy||state.location.status!=='in_room'" @click="emit('action',{kind:'temporary_departure'})">↗ Убыл</button><button :disabled="busy||state.location.status==='not_arrived'" @click="emit('action',{kind:'departure'})">✓ Завершил день</button></div></template>
    </template>
    <p v-else class="read-only-note">{{employee.archived?'Сотрудник в архиве. Восстановите его в настройках для новых отметок.':'История выбранного дня доступна только для просмотра.'}}</p>
    <div class="section-line"><h3>История за день</h3><button v-if="events.length&&!readonly" class="text-button" :disabled="busy" @click="emit('undo')">↶ Отменить последнее</button></div>
    <EventJournal :events="events" :room-name="roomName" :employee-name="employeeName" compact />
    </div>
  </dialog>
</template>
<style scoped>
.home-room-button {
  grid-column: 1 / -1;
}
</style>
