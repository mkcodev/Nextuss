import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

/** El chip «Necesita configuración» cuando falte la clave llega en un PR aparte (#98 P5, Tus datos +
 * configuración pendiente). */
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
}
