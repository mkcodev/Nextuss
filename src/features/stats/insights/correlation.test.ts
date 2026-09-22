import { describe, expect, it } from 'vitest'
import { pearsonCorrelation } from './correlation'

describe('pearsonCorrelation', () => {
  it('is 1 for a perfectly increasing linear relationship', () => {
    const { r, strengthLabel } = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    expect(r).toBeCloseTo(1)
    expect(strengthLabel).toBe('fuerte')
  })

  it('is -1 for a perfectly decreasing linear relationship', () => {
    const { r } = pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
    expect(r).toBeCloseTo(-1)
  })

  it('is close to 0 for unrelated (deranged) data', () => {
    const { r, strengthLabel } = pearsonCorrelation([1, 2, 3, 4, 5, 6], [4, 2, 5, 1, 6, 3])
    expect(Math.abs(r)).toBeLessThan(0.15)
    expect(strengthLabel).toBe('ninguna')
  })

  it('treats fewer than 3 pairs as no correlation, never divides by near-zero noise', () => {
    expect(pearsonCorrelation([1, 2], [1, 2])).toEqual({ r: 0, n: 2, strengthLabel: 'ninguna' })
  })

  it('handles a constant series (zero variance) without NaN', () => {
    const { r } = pearsonCorrelation([1, 1, 1, 1], [1, 2, 3, 4])
    expect(r).toBe(0)
  })
})
