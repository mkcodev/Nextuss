import { db } from '../schema'
import { addActualMinutes } from './tasks'
import { emit } from '../../lib/events/bus'

export interface LogFocusSessionInput {
  taskId?: number
  start: number
  end: number
  durationMin: number
  interruptions: number
}

export async function logFocusSession(input: LogFocusSessionInput) {
  await db.focusSessions.add(input)
  if (input.taskId && input.durationMin > 0) {
    await addActualMinutes(input.taskId, input.durationMin)
  }
  emit('focus.finished', { taskId: input.taskId, minutes: input.durationMin })
}
