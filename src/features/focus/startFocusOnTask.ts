import { getOrCreateSettings } from '../../db/repositories/settings'
import { ensurePanelVisible } from '../../app/dock/ensurePanelVisible'
import { durationsFromSettings } from './durations'
import { elapsedSeconds, useFocusTimerStore } from './focusTimerStore'
import { logWorkSegmentIfSignificant } from './logSegment'

/** Attaches the Pomodoro timer to `taskId` and starts a fresh work segment right away — the same
 * sequence `FocusPanel` does by hand across its mode-switch/reset/task-select controls, centralized
 * so "empezar foco" from a task row anywhere else in the app doesn't duplicate it. */
export async function startFocusOnTask(taskId: number): Promise<void> {
  const s = useFocusTimerStore.getState()
  if (s.mode === 'work') await logWorkSegmentIfSignificant(elapsedSeconds(s), s.taskId, s.interruptions)

  const settings = await getOrCreateSettings()
  const durations = durationsFromSettings(settings)

  useFocusTimerStore.getState().goToMode('work', durations.work, s.cyclesCompleted)
  useFocusTimerStore.getState().setTaskId(taskId)
  useFocusTimerStore.getState().start()
  ensurePanelVisible('focus')
}
