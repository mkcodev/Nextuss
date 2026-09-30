import type { PluginId } from '../types'
import type { PluginSettingsSpec } from './types'
import { virtualizationSettingsSpec } from '../../virtualization/settingsSpec'
import { checkinSettingsSpec } from '../../checkin/settingsSpec'
import { routinesSettingsSpec } from '../../routines/settingsSpec'
import { dayTimeSettingsSpec } from '../../today/dayTimeSettingsSpec'
import { todaySettingsSpec } from '../../today/todaySettingsSpec'
import { habitsSettingsSpec } from '../../habits/settingsSpec'
import { focusSettingsSpec } from '../../focus/settingsSpec'
import { gamificationSettingsSpec } from '../../gamification/settingsSpec'
import { weeklyReviewSettingsSpec } from '../../planner/weeklyReviewSettingsSpec'
import { planningSettingsSpec } from '../../planner/planningSettingsSpec'
import { statsSettingsSpec } from '../../stats/settingsSpec'
import { aiSettingsSpec } from '../../ai/settingsSpec'
import { telegramSettingsSpec } from '../../telegram/settingsSpec'
import { launchersSettingsSpec } from '../../launchers/settingsSpec'
import { tasksSettingsSpec } from '../../tasks/settingsSpec'
import { projectsSettingsSpec } from '../../projects/settingsSpec'

/** Un `PluginSettingsSpec` por cada plugin del registro (también los del núcleo) — agregador único que
 * lee P4/P5/P6 en vez de cada uno tener que conocer la lista completa de plugins. */
export const PLUGIN_SETTINGS: Record<PluginId, PluginSettingsSpec> = {
  today: todaySettingsSpec,
  tasks: tasksSettingsSpec,
  projects: projectsSettingsSpec,
  planning: planningSettingsSpec,
  virtualization: virtualizationSettingsSpec,
  checkin: checkinSettingsSpec,
  routines: routinesSettingsSpec,
  dayTime: dayTimeSettingsSpec,
  habits: habitsSettingsSpec,
  focus: focusSettingsSpec,
  gamification: gamificationSettingsSpec,
  weeklyReview: weeklyReviewSettingsSpec,
  stats: statsSettingsSpec,
  ai: aiSettingsSpec,
  telegram: telegramSettingsSpec,
  launchers: launchersSettingsSpec,
}
