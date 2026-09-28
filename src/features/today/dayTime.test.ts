import { describe, expect, it } from 'vitest'
import type { Task } from '../../db/types'
import { dayCells, formatShort, summarizeDay } from './dayTime'

const hm = (h: number, m = 0) => h * 60 + m

function task(id: number, start: string, end: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `T${id}`,
    status: 'planned',
    postponedCount: 0,
    createdAt: 0,
    deletedAt: 0,
    sortKey: 0,
    tagIds: [],
    xpAwarded: 0,
    scheduledDate: '2026-09-28',
    scheduledStart: start,
    scheduledEnd: end,
    ...overrides,
  }
}

const day = (tasks: Task[], nowMin: number) => summarizeDay({ tasks, nowMin, dayStartHour: 7, dayEndHour: 22 })

describe('summarizeDay', () => {
  it('durante la jornada: lo que queda, lo planificado y lo siguiente', () => {
    const s = day([task(1, '14:00', '14:30'), task(2, '16:00', '18:00'), task(3, '09:00', '10:00')], hm(13, 40))
    expect(s.phase).toBe('during')
    expect(s.leftMin).toBe(8 * 60 + 20)
    expect(s.plannedLeftMin).toBe(150)
    expect(s.freeLeftMin).toBe(8 * 60 + 20 - 150)
    expect(s.next).toEqual({ title: 'T1', start: '14:00', inMin: 20 })
    expect(s.elapsed).toBeCloseTo((6 * 60 + 40) / (15 * 60))
  })

  it('solo cuenta lo pendiente que queda por delante, sin duplicar solapes', () => {
    const s = day(
      [task(1, '13:00', '14:00'), task(2, '13:30', '15:00'), task(3, '15:00', '16:00', { status: 'done' })],
      hm(13, 40),
    )
    // De 13:40 a 15:00 cubierto una sola vez; la hecha no cuenta.
    expect(s.plannedLeftMin).toBe(80)
  })

  it('ignora subtareas y tareas sin franja completa', () => {
    const s = day([task(1, '14:00', '15:00', { parentId: 9 }), task(2, '14:00', '', {})], hm(13))
    expect(s.blocks).toEqual([])
    expect(s.next).toBeNull()
  })

  it('antes de empezar queda la jornada entera; al acabar, nada', () => {
    expect(day([], hm(6)).phase).toBe('before')
    expect(day([], hm(6)).leftMin).toBe(15 * 60)
    const after = day([], hm(22, 30))
    expect(after.phase).toBe('after')
    expect(after.leftMin).toBe(0)
    expect(after.elapsed).toBe(1)
  })
})

describe('dayCells', () => {
  it('casillas de 30 min: pasadas, ocupadas y libres, con la actual marcada', () => {
    const s = day([task(1, '08:00', '09:00')], hm(7, 40))
    const cells = dayCells(s, hm(7, 40))
    expect(cells).toHaveLength(30)
    expect(cells[0]).toMatchObject({ status: 'past', current: false })
    expect(cells[1]).toMatchObject({ status: 'free', current: true })
    expect(cells[2].status).toBe('busy')
    expect(cells[3].status).toBe('busy')
    expect(cells[4].status).toBe('free')
  })
})

describe('formatShort', () => {
  it('formatea corto para la barra superior', () => {
    expect(formatShort(45)).toBe('45 min')
    expect(formatShort(120)).toBe('2 h')
    expect(formatShort(500)).toBe('8 h 20')
    expect(formatShort(485)).toBe('8 h 05')
  })
})
