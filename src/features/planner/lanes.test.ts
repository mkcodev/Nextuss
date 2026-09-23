import { describe, expect, it } from 'vitest'
import { packLanes, type LaneInput } from './lanes'

describe('packLanes', () => {
  it('returns an empty map for no intervals', () => {
    expect(packLanes([])).toEqual(new Map())
  })

  it('puts a single interval in lane 0 with laneCount 1', () => {
    const result = packLanes([{ id: 1, start: 540, end: 600 }])
    expect(result.get(1)).toEqual({ lane: 0, laneCount: 1 })
  })

  it('touching intervals share lane 0, laneCount 1', () => {
    const result = packLanes([
      { id: 1, start: 540, end: 600 },
      { id: 2, start: 600, end: 660 },
    ])
    expect(result.get(1)).toEqual({ lane: 0, laneCount: 1 })
    expect(result.get(2)).toEqual({ lane: 0, laneCount: 1 })
  })

  it('two identical intervals get separate lanes, laneCount 2', () => {
    const result = packLanes([
      { id: 1, start: 540, end: 600 },
      { id: 2, start: 540, end: 600 },
    ])
    const a = result.get(1)!
    const b = result.get(2)!
    expect(a.laneCount).toBe(2)
    expect(b.laneCount).toBe(2)
    expect(a.lane).not.toBe(b.lane)
  })

  it('a transitive chain (A-B overlap, B-C overlap, A-C no overlap) forms one cluster of 2 lanes', () => {
    // A: 9:00-10:30, B: 10:00-11:30, C: 11:00-12:00 — A and C never overlap directly
    const intervals: LaneInput[] = [
      { id: 1, start: 540, end: 630 }, // A
      { id: 2, start: 600, end: 690 }, // B
      { id: 3, start: 660, end: 720 }, // C
    ]
    const result = packLanes(intervals)
    expect(result.get(1)!.laneCount).toBe(2)
    expect(result.get(2)!.laneCount).toBe(2)
    expect(result.get(3)!.laneCount).toBe(2)
    // A and C can share a lane (they don't overlap each other), B must be in the other lane
    expect(result.get(1)!.lane).toBe(result.get(3)!.lane)
    expect(result.get(2)!.lane).not.toBe(result.get(1)!.lane)
  })

  it('containment: one long interval plus 3 sequential short ones inside it needs 2 lanes', () => {
    const intervals: LaneInput[] = [
      { id: 1, start: 540, end: 720 }, // 9:00-12:00, the long one
      { id: 2, start: 540, end: 600 }, // 9:00-10:00
      { id: 3, start: 600, end: 660 }, // 10:00-11:00
      { id: 4, start: 660, end: 720 }, // 11:00-12:00
    ]
    const result = packLanes(intervals)
    expect(result.get(1)!.laneCount).toBe(2)
    // the three short ones can all share the second lane (they don't overlap each other)
    expect(result.get(2)!.lane).toBe(result.get(3)!.lane)
    expect(result.get(3)!.lane).toBe(result.get(4)!.lane)
    expect(result.get(1)!.lane).not.toBe(result.get(2)!.lane)
  })

  it('two independent clusters keep independent lane counts', () => {
    const intervals: LaneInput[] = [
      { id: 1, start: 480, end: 540 },
      { id: 2, start: 480, end: 540 },
      { id: 3, start: 480, end: 540 }, // cluster of 3 overlapping, 9:00 block
      { id: 4, start: 900, end: 960 }, // far later, isolated
    ]
    const result = packLanes(intervals)
    expect(result.get(1)!.laneCount).toBe(3)
    expect(result.get(2)!.laneCount).toBe(3)
    expect(result.get(3)!.laneCount).toBe(3)
    expect(result.get(4)!.laneCount).toBe(1)
  })

  it('is order-independent (shuffled input gives the same lane counts)', () => {
    const intervals: LaneInput[] = [
      { id: 3, start: 660, end: 720 },
      { id: 1, start: 540, end: 630 },
      { id: 2, start: 600, end: 690 },
    ]
    const result = packLanes(intervals)
    expect(result.get(1)!.laneCount).toBe(2)
    expect(result.get(2)!.laneCount).toBe(2)
    expect(result.get(3)!.laneCount).toBe(2)
  })

  it('handles a zero-length interval', () => {
    const result = packLanes([{ id: 1, start: 540, end: 540 }])
    expect(result.get(1)).toEqual({ lane: 0, laneCount: 1 })
  })
})
