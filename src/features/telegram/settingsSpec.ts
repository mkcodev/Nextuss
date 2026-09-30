import type { PluginSettingsSpec } from '../plugins/settings/types'

/** Token/chat (secretos) y el reenvío viven en `TelegramSection` (pieza a medida: hay que poder
 * conectar y probar) — llega en P5, con el chip «Necesita configuración» cuando falte la conexión. */
export const telegramSettingsSpec: PluginSettingsSpec = {
  fields: [],
}
