import { describe, expect, it } from 'vitest'
import { clampMoveStart, clampResizeEnd, findFreeInterval, intervalWidth } from './collision'

const DAY_START = 7 * 60 // 07:00
const DAY_END = 22 * 60 // 22:00

describe('findFreeInterval', () => {
  it('spans the whole day when there are no other tasks', () => {
    expect(findFreeInterval([], 600, DAY_START, DAY_END)).toEqual({ start: DAY_START, end: DAY_END })
  })

  it('is bounded below by a task ending before the desired start', () => {
    const others = [{ start: 480, end: 540 }] // 08:00-09:00
    expect(findFreeInterval(others, 600, DAY_START, DAY_END)).toEqual({ start: 540, end: DAY_END })
  })

  it('is bounded above by a task starting after the desired start', () => {
    const others = [{ start: 660, end: 720 }] // 11:00-12:00
    expect(findFreeInterval(others, 600, DAY_START, DAY_END)).toEqual({ start: DAY_START, end: 660 })
  })

  it('is squeezed between two neighbors', () => {
    const others = [
      { start: 480, end: 540 }, // 08:00-09:00
      { start: 660, end: 720 }, // 11:00-12:00
    ]
    expect(findFreeInterval(others, 600, DAY_START, DAY_END)).toEqual({ start: 540, end: 660 })
  })

  it('pushes to the earlier edge when the desired point falls inside a task, closer to its start', () => {
    const others = [{ start: 540, end: 660 }] // 09:00-11:00
    expect(findFreeInterval(others, 560, DAY_START, DAY_END)).toEqual({ start: DAY_START, end: 540 })
  })

  it('pushes to the later edge when the desired point falls inside a task, closer to its end', () => {
    const others = [{ start: 540, end: 660 }] // 09:00-11:00
    expect(findFreeInterval(others, 640, DAY_START, DAY_END)).toEqual({ start: 660, end: DAY_END })
  })
})

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
