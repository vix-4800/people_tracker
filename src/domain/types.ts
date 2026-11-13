export interface DirectoryEntry { id: string; name: string; archived: boolean; order: number }
export type Location = { status: 'not_arrived' | 'away' | 'finished' } | { status: 'in_room'; roomId: string }
export type EventType = 'arrival' | 'room_change' | 'temporary_departure' | 'return' | 'departure' | 'reopen'
export type Action = { kind: 'room' | 'reopen'; roomId: string } | { kind: 'temporary_departure' | 'departure' }
export interface MovementEvent { id: string; employeeId: string; type: EventType; day: string; timestamp: number; sequence: number; from: Location; to: Location }
export interface EmployeeState { location: Location; firstArrival?: number; departure?: number; lastChange?: number }
export interface Setting { key: string; value: string }
export interface Backup { format: 'office-movements'; version: 1; exportedAt: string; employees: DirectoryEntry[]; rooms: DirectoryEntry[]; movementEvents: MovementEvent[]; settings: Setting[] }
