export type FocusMode = 'work' | 'break' | 'longBreak'

export interface FocusCycleState {
  mode: FocusMode
  cyclesCompleted: number
}

/** Regla del ciclo pomodoro: tras 4 tramos de trabajo toca descanso largo, el resto son cortos;
 * tras cualquier descanso se vuelve a trabajar. Pura para poder testear la regla sin el store. */
export function nextFocusMode({ mode, cyclesCompleted }: FocusCycleState): FocusCycleState {
  if (mode !== 'work') return { mode: 'work', cyclesCompleted }
  const cycles = cyclesCompleted + 1
  return { mode: cycles % 4 === 0 ? 'longBreak' : 'break', cyclesCompleted: cycles }
}
