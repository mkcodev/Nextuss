import { Activity, Gauge, NotebookPen, PanelTop, Sparkles, Timer, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { PluginId } from '../../features/plugins/types'
import { ProgressPanel } from './panels/ProgressPanel'
import { ActivityPanel } from './panels/ActivityPanel'
import { CapturePanel } from './panels/CapturePanel'
import { ContextPanel } from './panels/ContextPanel'
import { FocusPanel } from './panels/FocusPanel'
import { InsightsPanel } from './panels/InsightsPanel'

export type PanelKey = 'progress' | 'context' | 'activity' | 'capture' | 'focus' | 'insights'

export interface PanelDef {
  key: PanelKey
  label: string
  icon: LucideIcon
  component: ComponentType
  pluginId?: PluginId // sin él, el panel se ve siempre
}

export const PANEL_REGISTRY: Record<PanelKey, PanelDef> = {
  progress: { key: 'progress', label: 'Progreso', icon: Gauge, component: ProgressPanel, pluginId: 'gamification' },
  context: { key: 'context', label: 'Contextual', icon: PanelTop, component: ContextPanel },
  activity: { key: 'activity', label: 'Actividad', icon: Activity, component: ActivityPanel },
  capture: { key: 'capture', label: 'Captura', icon: NotebookPen, component: CapturePanel },
  focus: { key: 'focus', label: 'Enfoque', icon: Timer, component: FocusPanel, pluginId: 'focus' },
  insights: { key: 'insights', label: 'Insights', icon: Sparkles, component: InsightsPanel, pluginId: 'stats' },
}

export const PANEL_LIST: PanelDef[] = Object.values(PANEL_REGISTRY)

export const DEFAULT_PANEL_ORDER: PanelKey[] = PANEL_LIST.map((p) => p.key)

/** Paneles de plugins activos. El orden guardado en `uiStore` conserva los ocultos para cuando vuelvan. */
export function isPanelVisible(key: PanelKey, enabled: ReadonlySet<PluginId>): boolean {
  const pluginId = PANEL_REGISTRY[key].pluginId
  return !pluginId || enabled.has(pluginId)
}
