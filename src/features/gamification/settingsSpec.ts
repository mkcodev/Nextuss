import { lazyNamed } from '../../app/lazy'
import { getOrCreateProgress } from '../../db/repositories/gamification'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const gamificationSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'custom',
      id: 'achievements',
      label: 'Logros',
      group: 'Progreso',
      keywords: ['logros', 'achievements', 'xp'],
      component: lazyNamed(() => import('./AchievementsSettings'), 'AchievementsSettings'),
    },
  ],
  dataSummary: async () => {
    const progress = await getOrCreateProgress()
    return [
      { label: 'Nivel', value: String(progress.level) },
      { label: 'XP total', value: String(progress.totalXp) },
    ]
  },
}
