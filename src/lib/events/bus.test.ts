import { afterEach, describe, expect, it, vi } from 'vitest'
import { emit, on, recentEvents, resetBus } from './bus'

afterEach(() => resetBus())

describe('bus de eventos', () => {
  it('entrega el payload y la cadena de causas a los oyentes de ese tipo', () => {
    const seen = vi.fn()
    on('day.closed', seen)
    emit('day.closed', { date: '2026-09-28' }, ['launcher:1'])
    expect(seen).toHaveBeenCalledWith({ date: '2026-09-28' }, expect.objectContaining({ cause: ['launcher:1'] }))
  })

  it('dejar de escuchar corta la entrega', () => {
    const seen = vi.fn()
    const off = on('habit.logged', seen)
    off()
    emit('habit.logged', { habitId: 1, date: '2026-09-28' })
    expect(seen).not.toHaveBeenCalled()
  })

  it('un oyente que falla no impide que los demás reciban el evento', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen = vi.fn()
    on('day.closed', () => {
      throw new Error('boom')
    })
    on('day.closed', seen)
    emit('day.closed', { date: '2026-09-28' })
    expect(seen).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('el diario guarda los eventos pero no los ticks del reloj', () => {
    emit('clock.tick', { date: '2026-09-28', hhmm: '09:00' })
    emit('day.closed', { date: '2026-09-28' })
    expect(recentEvents().map((e) => e.type)).toEqual(['day.closed'])
  })
})
