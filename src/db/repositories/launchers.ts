import { db } from '../schema'
import type { Launcher, LauncherRun } from '../types'

export type LauncherInput = Omit<Launcher, 'id' | 'sortKey' | 'deletedAt' | 'createdAt'>

/** Lanzadores vivos (activos o no), en su orden manual. */
export async function listLaunchers(): Promise<Launcher[]> {
  return db.launchers.where('deletedAt').equals(0).sortBy('sortKey')
}

export async function getLauncher(id: number): Promise<Launcher | null> {
  return (await db.launchers.get(id)) ?? null
}

export async function getLauncherByBuiltin(builtinKey: string): Promise<Launcher | null> {
  return (await db.launchers.where('builtinKey').equals(builtinKey).first()) ?? null
}

export async function createLauncher(input: LauncherInput): Promise<number> {
  const last = await db.launchers.orderBy('sortKey').last()
  return (await db.launchers.add({
    ...input,
    sortKey: (last?.sortKey ?? 0) + 1000,
    deletedAt: 0,
    createdAt: Date.now(),
  })) as number
}

// Leer y reescribir la fila: el tipo recursivo de `LauncherAction` (`ask`) desborda el `UpdateSpec` de Dexie.
export async function updateLauncher(id: number, changes: Partial<LauncherInput>): Promise<void> {
  const current = await db.launchers.get(id)
  if (current) await db.launchers.put({ ...current, ...changes })
}

/** Borrado suave. Los integrados no se borran: se desactivan. */
export async function deleteLauncher(id: number): Promise<void> {
  const launcher = await db.launchers.get(id)
  if (!launcher) return
  await db.launchers.put(launcher.builtinKey ? { ...launcher, enabled: false } : { ...launcher, deletedAt: Date.now() })
}

export async function logLauncherRun(run: Omit<LauncherRun, 'id'>): Promise<void> {
  await db.launcherRuns.add(run)
}

/** Ejecuciones de `date` (todas las del día, para los topes y «una vez al día»). */
export async function getLauncherRunsForDate(date: string): Promise<LauncherRun[]> {
  return db.launcherRuns.where('date').equals(date).toArray()
}

export async function listRecentLauncherRuns(limit = 50): Promise<LauncherRun[]> {
  return db.launcherRuns.orderBy('firedAt').reverse().limit(limit).toArray()
}

export async function purgeOldLauncherRuns(now: number, retentionMs: number): Promise<number> {
  return db.launcherRuns.where('firedAt').below(now - retentionMs).delete()
}
