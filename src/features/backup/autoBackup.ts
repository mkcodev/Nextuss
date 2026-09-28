// Copia automática a una carpeta del disco (File System Access, Chrome/Edge) y recordatorio de copia.
// El permiso de la carpeta y las marcas de tiempo viven en una base de datos aparte, propia de este
// dispositivo: no deben viajar dentro de las copias (un handle de carpeta no se puede serializar y la
// fecha de la última copia es de este navegador, no de los datos).
import Dexie, { type Table } from 'dexie'
import { exportDatabase } from '../../db/backup'
import { downloadJson } from '../stats/export'
import { dateKey } from '../../lib/dates'

interface DirHandle {
  name: string
  queryPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
  }>
  removeEntry(name: string): Promise<void>
  keys(): AsyncIterableIterator<string>
}

interface DeviceKv {
  key: string
  value: unknown
}

class DeviceDB extends Dexie {
  kv!: Table<DeviceKv, string>
  constructor() {
    super('nextuss-device')
    this.version(1).stores({ kv: 'key' })
  }
}

const deviceDb = new DeviceDB()

const K_HANDLE = 'backupDir'
const K_LAST_BACKUP = 'lastBackupAt'
const K_LAST_REMINDER = 'lastBackupReminderAt'
const FILE_PREFIX = 'nextuss-backup-'
const KEEP_FILES = 7
const AUTO_INTERVAL_MS = 20 * 60 * 60 * 1000
export const REMIND_AFTER_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

async function getKv<T>(key: string): Promise<T | undefined> {
  return (await deviceDb.kv.get(key))?.value as T | undefined
}

async function setKv(key: string, value: unknown): Promise<void> {
  await deviceDb.kv.put({ key, value })
}

export function isAutoBackupSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function getBackupDir(): Promise<DirHandle | undefined> {
  return getKv<DirHandle>(K_HANDLE)
}

export async function getLastBackupAt(): Promise<number | undefined> {
  return getKv<number>(K_LAST_BACKUP)
}

export async function markBackedUp(now = Date.now()): Promise<void> {
  await setKv(K_LAST_BACKUP, now)
}

/** Descarga manual de la copia completa; cuenta como copia para el recordatorio. */
export async function downloadFullBackup(): Promise<void> {
  const payload = await exportDatabase()
  downloadJson(`${FILE_PREFIX}${dateKey(new Date())}.json`, payload)
  await markBackedUp()
}

/** Pide la carpeta (necesita gesto del usuario) y hace la primera copia en ella. */
export async function chooseBackupDir(): Promise<string> {
  const picker = (window as unknown as { showDirectoryPicker(o: { mode: 'readwrite'; id: string }): Promise<DirHandle> })
    .showDirectoryPicker
  const dir = await picker({ mode: 'readwrite', id: 'nextuss-backup' })
  await setKv(K_HANDLE, dir)
  await writeBackupTo(dir)
  return dir.name
}

export async function forgetBackupDir(): Promise<void> {
  await deviceDb.kv.delete(K_HANDLE)
}

/** Con gesto del usuario: vuelve a conceder el permiso de la carpeta (el navegador lo retira al cerrar). */
export async function reauthorizeAndBackup(): Promise<boolean> {
  const dir = await getBackupDir()
  if (!dir) return false
  if ((await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') return false
  await writeBackupTo(dir)
  return true
}

export async function backupNowToDir(): Promise<void> {
  const dir = await getBackupDir()
  if (!dir) throw new Error('No hay carpeta de copias elegida')
  if ((await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Permiso denegado')
  await writeBackupTo(dir)
}

async function writeBackupTo(dir: DirHandle): Promise<void> {
  const payload = await exportDatabase()
  const name = `${FILE_PREFIX}${dateKey(new Date())}.json`
  const file = await dir.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  await writable.close()
  await markBackedUp()
  await pruneOldBackups(dir)
}

/** Copias a borrar para quedarse con las `keep` más recientes (el nombre lleva la fecha, así que
 * ordenar por nombre es ordenar por fecha). Ignora cualquier otro archivo de la carpeta. */
export function staleBackups(names: string[], keep = KEEP_FILES): string[] {
  const ours = names.filter((n) => n.startsWith(FILE_PREFIX) && n.endsWith('.json')).sort()
  return ours.slice(0, Math.max(0, ours.length - keep))
}

async function pruneOldBackups(dir: DirHandle): Promise<void> {
  const names: string[] = []
  for await (const name of dir.keys()) names.push(name)
  for (const name of staleBackups(names)) await dir.removeEntry(name)
}

export type AutoBackupOutcome = 'done' | 'not-due' | 'no-dir' | 'needs-permission' | 'failed'

/** Al abrir la app: si hay carpeta con permiso vigente y la última copia tiene más de ~1 día, copia. */
export async function runAutoBackupIfDue(now = Date.now()): Promise<AutoBackupOutcome> {
  const dir = await getBackupDir()
  if (!dir) return 'no-dir'
  const last = await getLastBackupAt()
  if (last && now - last < AUTO_INTERVAL_MS) return 'not-due'
  try {
    if ((await dir.queryPermission({ mode: 'readwrite' })) !== 'granted') return 'needs-permission'
    await writeBackupTo(dir)
    return 'done'
  } catch {
    return 'failed'
  }
}

/** ¿Toca recordar hacer copia? Como mucho una vez al día, y solo si hay datos y la última copia es vieja. */
export async function shouldRemindBackup(hasData: boolean, now = Date.now()): Promise<number | null> {
  if (!hasData) return null
  const last = await getLastBackupAt()
  const days = last ? Math.floor((now - last) / DAY_MS) : null
  if (days !== null && days < REMIND_AFTER_DAYS) return null
  const lastReminder = await getKv<number>(K_LAST_REMINDER)
  if (lastReminder && now - lastReminder < DAY_MS) return null
  await setKv(K_LAST_REMINDER, now)
  return days ?? -1
}
