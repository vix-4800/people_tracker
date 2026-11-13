import type { EventType, Location } from '../domain/types'
export const statusNames = {not_arrived:'Не прибыл',in_room:'В офисе',away:'Убыл',finished:'Завершил день'}
export const eventNames: Record<EventType,string> = {arrival:'Прибыл',room_change:'Перешёл',temporary_departure:'Убыл',return:'Вернулся',departure:'Завершил день',reopen:'Возобновил день'}
export function time(timestamp?:number) { return timestamp===undefined?'—':new Date(timestamp).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) }
export function locationName(location:Location, roomName:(id:string)=>string) { return location.status==='in_room'?roomName(location.roomId):statusNames[location.status] }
