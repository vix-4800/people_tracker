<script setup lang="ts">
import type { MovementEvent } from '../domain/types'
import { eventNames, locationName, time } from '../utils/format'
defineProps<{events:MovementEvent[];roomName:(id:string)=>string;employeeName:(id:string)=>string;compact?:boolean}>()
</script>
<template>
  <p v-if="!events.length" class="empty-small">За этот день отметок пока нет.</p>
  <ol v-else class="timeline">
    <li v-for="event in events" :key="event.id"><time>{{time(event.timestamp)}}</time><div><strong v-if="!compact">{{employeeName(event.employeeId)}}</strong><p>{{eventNames[event.type]}}</p><small>{{locationName(event.from,roomName)}} <span aria-label="в">→</span> {{locationName(event.to,roomName)}}</small></div></li>
  </ol>
</template>
