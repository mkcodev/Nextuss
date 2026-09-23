import { describe, expect, it } from 'vitest'
import { minutesToY, yToMinutes, snapMinutes } from './geometry'

describe('minutesToY / yToMinutes', () => {
  it('maps the day start to y=0', () => {
    expect(minutesToY(420, 420)).toBe(0)
  })

  it('maps one hour later to one HOUR_HEIGHT down', () => {
    expect(minutesToY(480, 420)).toBe(60)
  })

  it('is the inverse of yToMinutes', () => {
    expect(yToMinutes(minutesToY(600, 420), 420)).toBe(600)
  })
})

describe('snapMinutes', () => {
  it('rounds down to the nearest 15 when closer to it', () => {
    expect(snapMinutes(547)).toBe(540)
  })

  it('rounds up to the nearest 15 when closer to it', () => {
    expect(snapMinutes(553)).toBe(555)
  })

  it('leaves an already-snapped value untouched', () => {
    expect(snapMinutes(540)).toBe(540)
  })
})
