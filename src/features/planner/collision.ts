/**
 * Bounds math for the daily timeline: a task may move or resize freely, but
 * never past the edges of the working day. Overlap between tasks is allowed
 * by design (see lanes.ts for how overlapping blocks are laid out side by
 * side) — these clamps only guard against dragging/resizing outside
 * [dayStartMin, dayEndMin].
 */

export interface Interval {
  start: number // minutes from midnight
  end: number
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
