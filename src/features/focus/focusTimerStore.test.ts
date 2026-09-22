import { describe, expect, it } from 'vitest'
import { elapsedSeconds } from './focusTimerStore'

describe('elapsedSeconds', () => {
  it('is just accumulatedSec while paused', () => {
    expect(elapsedSeconds({ running: false, startedAt: null, accumulatedSec: 42 }, 1_000_000)).toBe(42)
  })

  it('adds real wall-clock time since startedAt while running', () => {
    const startedAt = 1_000_000
    const now = startedAt + 10_000 // 10s later
    expect(elapsedSeconds({ running: true, startedAt, accumulatedSec: 5 }, now)).toBe(15)
  })

  it('is unaffected by how many ticks fired — only by real elapsed time (the bug this replaces)', () => {
    const startedAt = 0
    // Simulates a tab backgrounded for a long stretch: no ticks fired, but wall-clock time passed.
    const now = 60 * 60 * 1000 // 1h later, zero intermediate calls
    expect(elapsedSeconds({ running: true, startedAt, accumulatedSec: 0 }, now)).toBe(3600)
  })
})
