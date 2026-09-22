import { Activity, Gauge, HeartPulse, NotebookPen, PanelTop, Sparkles, Timer, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { ProgressPanel } from './panels/ProgressPanel'
import { ActivityPanel } from './panels/ActivityPanel'
import { CapturePanel } from './panels/CapturePanel'
import { ContextPanel } from './panels/ContextPanel'
import { FocusPanel } from './panels/FocusPanel'
import { CheckInPanel } from './panels/CheckInPanel'
import { InsightsPanel } from './panels/InsightsPanel'

export type PanelKey = 'progress' | 'context' | 'activity' | 'capture' | 'focus' | 'checkin' | 'insights'

export interface PanelDef {
  key: PanelKey
  label: string
  icon: LucideIcon
  component: ComponentType
}

export const PANEL_REGISTRY: Record<PanelKey, PanelDef> = {
  progress: { key: 'progress', label: 'Progreso', icon: Gauge, component: ProgressPanel },
  context: { key: 'context', label: 'Contextual', icon: PanelTop, component: ContextPanel },
  activity: { key: 'activity', label: 'Actividad', icon: Activity, component: ActivityPanel },
  capture: { key: 'capture', label: 'Captura', icon: NotebookPen, component: CapturePanel },
  focus: { key: 'focus', label: 'Enfoque', icon: Timer, component: FocusPanel },
  checkin: { key: 'checkin', label: 'Check-in', icon: HeartPulse, component: CheckInPanel },
  insights: { key: 'insights', label: 'Insights', icon: Sparkles, component: InsightsPanel },
}

export const PANEL_LIST: PanelDef[] = Object.values(PANEL_REGISTRY)

export const DEFAULT_PANEL_ORDER: PanelKey[] = PANEL_LIST.map((p) => p.key)
