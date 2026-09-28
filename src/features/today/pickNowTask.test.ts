import { describe, expect, it } from 'vitest'
import { pickNowTask } from './pickNowTask'
import type { Task } from '../../db/types'

const task = (over: Partial<Task>): Task => ({
  title: 't',
  status: 'planned',
  postponedCount: 0,
  createdAt: 0,
  deletedAt: 0,
  sortKey: 0,
  tagIds: [],
  xpAwarded: 0,
  ...over,
})

const at = (h: number, m = 0) => h * 60 + m

describe('pickNowTask', () => {
  const morning = task({ id: 1, title: 'mañana', scheduledStart: '09:00', scheduledEnd: '09:30' })
  const review = task({ id: 2, title: 'revisar', scheduledStart: '10:30', scheduledEnd: '11:15' })
  const call = task({ id: 3, title: 'llamada', scheduledStart: '12:00', scheduledEnd: '12:30' })

  it('elige la tarea cuya franja contiene la hora actual', () => {
    expect(pickNowTask([call, review, morning], at(11, 2))).toEqual({ task: review, mode: 'current' })
  })

  it('sin tarea en curso, elige la siguiente por hora de inicio', () => {
    expect(pickNowTask([call, review, morning], at(11, 20))).toEqual({ task: call, mode: 'next' })
  })

  it('ignora hechas, subtareas y tareas sin franja', () => {
    const done = { ...review, status: 'done' as const }
    const sub = task({ id: 4, parentId: 1, scheduledStart: '11:00', scheduledEnd: '11:30' })
    const loose = task({ id: 5 })
    expect(pickNowTask([done, sub, loose, call], at(11, 5))).toEqual({ task: call, mode: 'next' })
  })

  it('sin nada con hora, elige la tarea sin franja más prioritaria', () => {
    const low = task({ id: 6, priority: 4, sortKey: 0 })
    const high = task({ id: 7, priority: 1, sortKey: 2 })
    const none = task({ id: 8, sortKey: 1 })
    expect(pickNowTask([morning, none, low, high], at(20))).toEqual({ task: high, mode: 'pick' })
  })

  it('devuelve null cuando no queda nada por hacer', () => {
    expect(pickNowTask([morning, review], at(20))).toBeNull()
  })
})
