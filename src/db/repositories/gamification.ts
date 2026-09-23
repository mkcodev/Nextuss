import { db } from '../schema'
import { levelForXp } from '../../lib/xp'
import { SHIELDS_PER_MONTH } from '../../lib/streaks'
import { monthKey } from '../../lib/dates'
import type { Achievement } from '../types'

const PROGRESS_ID = 1

export async function getOrCreateProgress() {
  let progress = await db.progress.get(PROGRESS_ID)
  if (!progress) {
    const seeded = {
      id: PROGRESS_ID,
      totalXp: 0,
      level: 1,
      shields: SHIELDS_PER_MONTH,
      lastShieldRefill: monthKey(),
    }
    await db.progress.put(seeded)
    progress = seeded
  }
  return progress
}

/** Refills the monthly shield pool if the calendar month has rolled over. Unused shields do not carry over. */
export async function refillShieldsIfNewMonth() {
  const progress = await getOrCreateProgress()
  const currentMonth = monthKey()
  if (progress.lastShieldRefill !== currentMonth) {
    await db.progress.update(PROGRESS_ID, {
      shields: SHIELDS_PER_MONTH,
      lastShieldRefill: currentMonth,
    })
  }
}

export async function consumeShield(): Promise<boolean> {
  const progress = await getOrCreateProgress()
  if (progress.shields <= 0) return false
  await db.progress.update(PROGRESS_ID, { shields: progress.shields - 1 })
  return true
}

export interface XpDeltaResult {
  totalXp: number
  level: number
  leveledUp: boolean
}

/** Applies a signed XP delta (positive on completion, negative on undo) and reports level-ups. */
export async function applyXpDelta(delta: number): Promise<XpDeltaResult> {
  const progress = await getOrCreateProgress()
  const totalXp = Math.max(0, progress.totalXp + delta)
  const level = levelForXp(totalXp)
  await db.progress.update(PROGRESS_ID, { totalXp, level })
  return { totalXp, level, leveledUp: level > progress.level }
}

export async function applyAttributeXpDelta(attributeId: number | undefined, delta: number) {
  if (attributeId == null) return
  const attribute = await db.attributes.get(attributeId)
  if (!attribute) return
  await db.attributes.update(attributeId, { xp: Math.max(0, attribute.xp + delta) })
}

export function listAttributes() {
  return db.attributes.orderBy('order').toArray()
}

export async function createAttribute(input: { name: string; icon: string; color: string }) {
  const count = await db.attributes.count()
  return db.attributes.add({ ...input, xp: 0, order: count })
}

export function updateAttribute(id: number, changes: Partial<{ name: string; icon: string; color: string }>) {
  return db.attributes.update(id, changes)
}

/** Clears `attributeId` on any habit/goal that pointed at it before deleting for real — an attribute
 * has no trash/undo of its own, so this is the one place that must not leave a dangling reference. */
export function deleteAttribute(id: number) {
  return db.transaction('rw', db.attributes, db.habits, db.goals, async () => {
    await db.habits.where('attributeId').equals(id).modify({ attributeId: undefined })
    await db.goals.where('attributeId').equals(id).modify({ attributeId: undefined })
    await db.attributes.delete(id)
  })
}

export async function unlockAchievement(key: string): Promise<boolean> {
  const existing = await db.achievements.where('key').equals(key).first()
  if (existing) return false
  const entry: Achievement = { key, unlockedAt: Date.now() }
  await db.achievements.add(entry)
  return true
}

export function listAchievements() {
  return db.achievements.toArray()
}
