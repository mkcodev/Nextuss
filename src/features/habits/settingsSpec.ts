import { db } from '../../db/schema'
import { listHabits } from '../../db/repositories/habits'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const habitsSettingsSpec: PluginSettingsSpec = {
  fields: [],
  notify: ['notifyHabitReminders'],
  dataSummary: async () => {
    const [habits, completedLogs] = await Promise.all([listHabits(), db.habitLogs.filter((l) => l.completed).count()])
    return [
      { label: 'Hábitos activos', value: String(habits.length) },
      { label: 'Registros completados', value: String(completedLogs) },
    ]
  },
}
