import { lazyNamed } from '../../app/lazy'
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
}
