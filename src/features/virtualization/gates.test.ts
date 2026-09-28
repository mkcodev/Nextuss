import { describe, expect, it } from 'vitest'
import { shouldOpenVirtualization } from './gates'

describe('shouldOpenVirtualization', () => {
  it('por defecto (sin ajustes) abre antes de mediodía', () => {
    expect(shouldOpenVirtualization({}, new Date(2026, 8, 28, 8, 0))).toBe(true)
    expect(shouldOpenVirtualization({}, new Date(2026, 8, 28, 12, 0))).toBe(false)
  })

  it('respeta una ventana horaria distinta', () => {
    expect(shouldOpenVirtualization({ windowEndHour: 10 }, new Date(2026, 8, 28, 9, 59))).toBe(true)
    expect(shouldOpenVirtualization({ windowEndHour: 10 }, new Date(2026, 8, 28, 10, 0))).toBe(false)
  })

  it('desactivado explícitamente nunca abre, sea la hora que sea', () => {
    expect(shouldOpenVirtualization({ enabled: false }, new Date(2026, 8, 28, 7, 0))).toBe(false)
  })
})
