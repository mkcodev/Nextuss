import { listAllTasks } from '../../db/repositories/tasks'
import { dateKey, todayKey } from '../../lib/dates'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const tasksSettingsSpec: PluginSettingsSpec = {
  fields: [],
  notify: ['notifyZombieTasks'],
  dataSummary: async () => {
    const today = todayKey()
    const tasks = await listAllTasks()
    const active = tasks.filter((t) => t.status !== 'done').length
    const doneToday = tasks.filter((t) => t.completedAt != null && dateKey(new Date(t.completedAt)) === today).length
    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate != null && t.dueDate < today).length
    return [
      { label: 'Activas', value: String(active) },
      { label: 'Completadas hoy', value: String(doneToday) },
      { label: 'Vencidas', value: String(overdue) },
    ]
  },
}
