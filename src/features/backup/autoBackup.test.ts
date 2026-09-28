import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { backupReminderContent, markBackedUp, runAutoBackupIfDue, shouldRemindBackup, staleBackups } from './autoBackup'

const DAY = 24 * 60 * 60 * 1000

describe('staleBackups', () => {
  it('deja las 7 más recientes y no toca otros archivos', () => {
    const names = Array.from({ length: 9 }, (_, i) => `nextuss-backup-2026-09-0${i + 1}.json`)
    expect(staleBackups([...names, 'notas.txt', 'nextuss-backup-x.csv'])).toEqual([
      'nextuss-backup-2026-09-01.json',
      'nextuss-backup-2026-09-02.json',
    ])
  })

  it('con menos de 7 no borra nada', () => {
    expect(staleBackups(['nextuss-backup-2026-09-01.json'])).toEqual([])
  })
})

describe('recordatorio y copia automática', () => {
  beforeEach(async () => {
    await new Dexie('nextuss-device').open().then((d) => d.table('kv').clear()).catch(() => undefined)
  })

  it('sin datos no recuerda nada', async () => {
    expect(await shouldRemindBackup(false)).toBeNull()
  })

  it('sin copia nunca: recuerda una vez al día', async () => {
    const now = Date.now()
    expect(await shouldRemindBackup(true, now)).toBe(-1)
    expect(await shouldRemindBackup(true, now + 60_000)).toBeNull()
    expect(await shouldRemindBackup(true, now + DAY + 1)).toBe(-1)
  })

  it('con copia reciente no recuerda; con copia vieja cuenta los días', async () => {
    const now = Date.now()
    await markBackedUp(now - 2 * DAY)
    expect(await shouldRemindBackup(true, now)).toBeNull()
    await markBackedUp(now - 9 * DAY)
    expect(await shouldRemindBackup(true, now)).toBe(9)
  })

  it('sin carpeta elegida la copia automática no hace nada', async () => {
    expect(await runAutoBackupIfDue()).toBe('no-dir')
  })
})

describe('backupReminderContent', () => {
  it('ofrece elegir carpeta si el navegador puede y aún no hay ninguna', () => {
    expect(backupReminderContent(-1, true)).toMatchObject({ title: 'Aún no tienes copia de seguridad', action: 'choose-folder' })
  })

  it('ofrece descargar si no se puede elegir carpeta', () => {
    expect(backupReminderContent(9, false)).toMatchObject({ title: '9 días sin copia de seguridad', action: 'download' })
  })
})
