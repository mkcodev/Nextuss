/**
 * XP curve: total XP required to REACH level L is 25 * (L-1) * L (quadratic,
 * so each level takes a bit longer than the last — level 2 needs 50 XP,
 * level 5 needs 500, level 10 needs 2250).
 */

export const XP_PER_COMPLETION = 10
export const XP_PER_GOAL_WEEK = 50
export const XP_PER_GOAL_MONTH = 150

export function xpForLevel(level: number): number {
  return 25 * (level - 1) * level
}

export function levelForXp(totalXp: number): number {
  if (totalXp <= 0) return 1
  const estimate = Math.floor((25 + Math.sqrt(625 + 100 * totalXp)) / 50)
  // guard against float rounding landing one level off in either direction
  let level = Math.max(1, estimate)
  while (xpForLevel(level + 1) <= totalXp) level += 1
  while (level > 1 && xpForLevel(level) > totalXp) level -= 1
  return level
}

export interface LevelProgress {
  level: number
  xpIntoLevel: number
  xpForNextLevel: number
}

export function progressForXp(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp)
  const floor = xpForLevel(level)
  const nextFloor = xpForLevel(level + 1)
  return {
    level,
    xpIntoLevel: totalXp - floor,
    xpForNextLevel: nextFloor - floor,
  }
}
