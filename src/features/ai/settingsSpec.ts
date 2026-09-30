import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const aiSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'custom',
      id: 'claudeApiKey',
      label: 'Clave y modelo',
      keywords: ['clave', 'api', 'anthropic', 'modelo', 'claude'],
      component: lazyNamed(() => import('./AiSettings'), 'AiSettings'),
    },
  ],
  needsSetup: (s) => (!s.claudeApiKey?.trim() ? { reason: 'Falta la clave', fieldId: 'claudeApiKey' } : null),
}
