import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

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
  needsSetup: (s) => (!s.telegramBotToken || !s.telegramChatId ? { reason: 'Falta conectar el bot', fieldId: 'telegramConnection' } : null),
}
