import { HOUR_HEIGHT, SNAP_MIN } from './constants'

/** Minutes-from-midnight -> pixels from the top of the day column. */
export function minutesToY(min: number, dayStartMin: number): number {
  return ((min - dayStartMin) / 60) * HOUR_HEIGHT
}

/** Pixels from the top of the day column -> minutes-from-midnight. */
export function yToMinutes(y: number, dayStartMin: number): number {
  return (y / HOUR_HEIGHT) * 60 + dayStartMin
}

/** Rounds a minute value to the nearest SNAP_MIN increment. */
export function snapMinutes(min: number): number {
  return Math.round(min / SNAP_MIN) * SNAP_MIN
}
