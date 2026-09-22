/**
 * Collision math for the daily timeline: tasks may never overlap. Every
 * drag, resize, create, or drop is clamped to the free interval around the
 * target position before it's ever written to the DB — so the invariant
 * ("no two scheduled tasks share a minute") holds by construction, not by
 * validation after the fact.
 */

export interface Interval {
  start: number // minutes from midnight
  end: number
}

/**
 * Finds the free interval that contains (or is nearest to) `desiredStart`,
 * bounded by the day's edges and by any interval in `others` that isn't
 * being moved. If `desiredStart` falls inside another interval, resolves to
 * whichever side (before/after that interval) is closer.
 */
export function findFreeInterval(
  others: Interval[],
  desiredStart: number,
  dayStartMin: number,
  dayEndMin: number,
): Interval {
  let lower = dayStartMin
  let upper = dayEndMin

  for (const t of others) {
    if (t.end <= desiredStart) {
      lower = Math.max(lower, t.end)
    } else if (t.start >= desiredStart) {
      upper = Math.min(upper, t.start)
    } else {
      // desiredStart lands inside this interval — push out to the nearer edge
      const distToStart = desiredStart - t.start
      const distToEnd = t.end - desiredStart
      if (distToStart <= distToEnd) upper = Math.min(upper, t.start)
      else lower = Math.max(lower, t.end)
    }
  }

  return { start: lower, end: Math.max(lower, upper) }
}

/** Clamps a fixed-duration move so [start, start+duration] fits inside `interval`. */
export function clampMoveStart(interval: Interval, duration: number, desiredStart: number): number {
  const maxStart = Math.max(interval.start, interval.end - duration)
  return Math.min(Math.max(desiredStart, interval.start), maxStart)
}

/** Clamps a resize (fixed start) so the new end never crosses into the next task. */
export function clampResizeEnd(interval: Interval, desiredEnd: number): number {
  return Math.min(Math.max(desiredEnd, interval.start), interval.end)
}

export function intervalWidth(interval: Interval): number {
  return Math.max(0, interval.end - interval.start)
}
