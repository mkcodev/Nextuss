import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

/** El chip «Necesita configuración» cuando falte la conexión llega en un PR aparte (#98 P5, Tus datos +
 * configuración pendiente). */
export const telegramSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'custom',
      id: 'telegramConnection',
      label: 'Conexión',
      keywords: ['telegram', 'bot', 'token', 'conectar'],
      component: lazyNamed(() => import('./TelegramSettings'), 'TelegramSettings'),
    },
  ],
}
