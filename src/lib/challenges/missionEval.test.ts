import { describe, expect, it } from 'vitest'
import { evaluateMission, type MissionSnapshot } from './missionEval'

const snap = (over: Partial<MissionSnapshot> = {}): MissionSnapshot => ({
  date: '2026-05-04',
  tasksCompleted: [],
  focusSessions: [],
  checkIn: null,
  habitLogs: [],
  ...over,
})
// Hora local, como `dateKey`.
const local = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) => new Date(y, m - 1, d, h, min, s, ms).getTime()

describe('evaluateMission', () => {
  it('tareas: 23:59:59.999 cuenta el día D y 00:00:00.000 el D+1', () => {
    const before = { status: 'done' as const, completedAt: local(2026, 5, 4, 23, 59, 59, 999) }
    const after = { status: 'done' as const, completedAt: local(2026, 5, 5, 0, 0, 0, 0) }
    const params = { template: 'tasks.complete-n' as const }
    expect(evaluateMission(params, snap({ tasksCompleted: [before, after] }))).toBe(1)
    expect(evaluateMission(params, snap({ date: '2026-05-05', tasksCompleted: [before, after] }))).toBe(1)
  })

  it('las subtareas y las tareas no hechas no cuentan', () => {
    const t = (extra: object) => ({ status: 'done' as const, completedAt: local(2026, 5, 4, 10), ...extra })
    const tasksCompleted = [t({}), t({ parentId: 9 }), t({ status: 'todo' }), t({ completedAt: undefined })]
    expect(evaluateMission({ template: 'tasks.complete-n' }, snap({ tasksCompleted }))).toBe(1)
  })

  it('P1 es la prioridad más alta', () => {
    const t = (priority?: number) => ({ status: 'done' as const, completedAt: local(2026, 5, 4, 10), priority })
    expect(evaluateMission({ template: 'tasks.high-priority' }, snap({ tasksCompleted: [t(1), t(2), t(4), t()] }))).toBe(1)
  })

  it('foco: una sesión que empieza a las 23:50 cuenta el día D, aunque acabe después', () => {
    const late = { start: local(2026, 5, 4, 23, 50), durationMin: 25 }
    const next = { start: local(2026, 5, 5, 0, 5), durationMin: 10 }
    const morning = { start: local(2026, 5, 4, 9), durationMin: 20 }
    const params = { template: 'focus.minutes' as const }
    expect(evaluateMission(params, snap({ focusSessions: [late, next, morning] }))).toBe(45)
    expect(evaluateMission(params, snap({ date: '2026-05-05', focusSessions: [late, next, morning] }))).toBe(10)
  })

  it('check-in a medias = 0, entero = 1', () => {
    const params = { template: 'checkin.answer' as const }
    expect(evaluateMission(params, snap())).toBe(0)
    expect(evaluateMission(params, snap({ checkIn: { energy: 3, mood: null, focus: 2 } }))).toBe(0)
    expect(evaluateMission(params, snap({ checkIn: { energy: 3, mood: 4, focus: 2 } }))).toBe(1)
  })

  it('hábitos: solo cuentan los de la misión y los completados', () => {
    const params = { template: 'habits.all-today' as const, refs: { habitIds: [1, 2, 3] } }
    const habitLogs = [
      { habitId: 1, completed: true },
      { habitId: 2, completed: false },
      { habitId: 9, completed: true },
    ]
    expect(evaluateMission(params, snap({ habitLogs }))).toBe(1)
  })
})
