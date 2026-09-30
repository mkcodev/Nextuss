import type { PluginSettingsSpec } from '../plugins/settings/types'

/** Clave, modelo y uso viven en `AiSection` (pieza a medida: la clave es un secreto y hay que poder
 * «probarla») — llega en P5, con el chip «Necesita configuración» cuando falte la clave. */
export const aiSettingsSpec: PluginSettingsSpec = {
  fields: [],
}
