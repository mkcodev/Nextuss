import { describe, expect, it } from 'vitest'
import { clampMoveStart, clampResizeEnd, intervalWidth } from './collision'

describe('clampMoveStart', () => {
  it('keeps the start when the whole duration already fits', () => {
    const interval = { start: 480, end: 600 }
    expect(clampMoveStart(interval, 30, 500)).toBe(500)
  })

  it('clamps to the interval start when the desired start is before it', () => {
    const interval = { start: 480, end: 600 }
    expect(clampMoveStart(interval, 30, 400)).toBe(480)
  })

  it('clamps so the end never exceeds the interval', () => {
    const interval = { start: 480, end: 600 }
    expect(clampMoveStart(interval, 30, 590)).toBe(570)
  })

  it('falls back to the interval start when duration exceeds the interval width', () => {
    const interval = { start: 480, end: 500 } // only 20 min wide
    expect(clampMoveStart(interval, 30, 490)).toBe(480)
  })
})

describe('clampResizeEnd', () => {
  it('keeps the desired end when it fits', () => {
    expect(clampResizeEnd({ start: 480, end: 600 }, 540)).toBe(540)
  })

  it('clamps to the interval end when the desired end overflows it', () => {
    expect(clampResizeEnd({ start: 480, end: 600 }, 650)).toBe(600)
  })

  it('never goes below the interval start', () => {
    expect(clampResizeEnd({ start: 480, end: 600 }, 400)).toBe(480)
  })
})

describe('intervalWidth', () => {
  it('computes a positive width normally', () => {
    expect(intervalWidth({ start: 480, end: 540 })).toBe(60)
  })

  it('never goes negative for an inverted interval', () => {
    expect(intervalWidth({ start: 600, end: 480 })).toBe(0)
  })
})
