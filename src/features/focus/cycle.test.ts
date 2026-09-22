import { describe, expect, it } from 'vitest'
import { nextFocusMode } from './cycle'

describe('nextFocusMode', () => {
  it('goes to a short break after work, incrementing the cycle count', () => {
    expect(nextFocusMode({ mode: 'work', cyclesCompleted: 0 })).toEqual({ mode: 'break', cyclesCompleted: 1 })
    expect(nextFocusMode({ mode: 'work', cyclesCompleted: 2 })).toEqual({ mode: 'break', cyclesCompleted: 3 })
  })

  it('goes to a long break on the 4th work segment of the cycle', () => {
    expect(nextFocusMode({ mode: 'work', cyclesCompleted: 3 })).toEqual({ mode: 'longBreak', cyclesCompleted: 4 })
    expect(nextFocusMode({ mode: 'work', cyclesCompleted: 7 })).toEqual({ mode: 'longBreak', cyclesCompleted: 8 })
  })

  it('always returns to work after any break, without touching the cycle count', () => {
    expect(nextFocusMode({ mode: 'break', cyclesCompleted: 1 })).toEqual({ mode: 'work', cyclesCompleted: 1 })
    expect(nextFocusMode({ mode: 'longBreak', cyclesCompleted: 4 })).toEqual({ mode: 'work', cyclesCompleted: 4 })
  })
})
