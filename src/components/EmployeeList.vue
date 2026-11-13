<script setup lang="ts">
import type { DirectoryEntry, EmployeeState } from '../domain/types'
import { locationName, time } from '../utils/format'
defineProps<{ employees:DirectoryEntry[]; states:Map<string,EmployeeState>; roomName:(id:string)=>string; readonly:boolean }>()
defineEmits<{select:[id:string]}>()
</script>
<template>
  <div class="employee-list">
    <div class="list-heading"><span>Сотрудник</span><span>Местонахождение</span><span>Последняя отметка</span></div>
    <button v-for="employee in employees" :key="employee.id" class="employee-row" @click="$emit('select',employee.id)">
      <span class="person"><span class="avatar" :class="states.get(employee.id)?.location.status">{{ employee.name.split(/\s+/).slice(0,2).map(x=>x[0]).join('') }}</span><span class="person-name">{{employee.name}}<small v-if="employee.archived">В архиве</small></span></span>
      <span class="location"><i class="status-dot" :class="states.get(employee.id)?.location.status"></i>{{locationName(states.get(employee.id)!.location,roomName)}}</span>
      <span class="last-time">{{time(states.get(employee.id)?.lastChange)}}<span class="row-arrow">›</span></span>
    </button>
  </div>
</template>
