import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Database, Download, FolderOpen, Upload } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button, Card, Dialog } from '../../design/primitives'
import { useToastStore } from '../../lib/toastStore'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import { importDatabase, BackupVersionMismatchError, type ImportMode } from '../../db/backup'
import {
  backupNowToDir,
  chooseBackupDir,
  downloadFullBackup,
  forgetBackupDir,
  getBackupDir,
  getLastBackupAt,
  isAutoBackupSupported,
  REMIND_AFTER_DAYS,
} from '../backup/autoBackup'

/** Full-database backup/restore. Lives in Ajustes → Datos, where a user actually looks for it —
 * previously only reachable from Estadísticas → Informes, alongside the (still period-scoped,
 * separate) CSV/JSON export there. */
export function BackupSection() {
  const [restoreState, setRestoreState] = useState<{ file: File; mode: ImportMode } | null>(null)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const push = useToastStore((s) => s.push)

  const downloadBackup = async () => {
    await downloadFullBackup()
    push({ title: 'Copia de seguridad descargada', variant: 'success' })
  }

  const pickRestoreFile = () => fileInputRef.current?.click()

  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setRestoreState({ file, mode: 'merge' })
  }

  const runRestore = async () => {
    if (!restoreState) return
    setRestoring(true)
    try {
      const text = await restoreState.file.text()
      const payload = JSON.parse(text)
      await importDatabase(payload, restoreState.mode)
      push({ title: 'Copia de seguridad restaurada', variant: 'success' })
      setRestoreState(null)
    } catch (err) {
      push({
        title: 'No se pudo restaurar',
        description: err instanceof BackupVersionMismatchError ? err.message : 'Comprueba que el archivo es una copia de seguridad de Nextuss válida.',
        variant: 'error',
      })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <Card id="backup" className="p-5">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
          <Database size={15} strokeWidth={1.75} /> Backup completo
        </h3>
        <p className="mb-3 text-xs text-text-faint">
          Copia de seguridad de toda la base de datos — la red de seguridad de una app 100% local.
        </p>
        <AutoBackupBlock />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadBackup}>
            <Download size={13} strokeWidth={1.75} /> Descargar copia de seguridad
          </Button>
          <Button variant="secondary" onClick={pickRestoreFile}>
            <Upload size={13} strokeWidth={1.75} /> Restaurar desde archivo
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={onFileChosen} />
        </div>
      </Card>

      <Dialog open={restoreState != null} onClose={() => setRestoreState(null)} title="Restaurar copia de seguridad">
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Archivo: <span className="font-medium text-text">{restoreState?.file.name}</span>
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="restore-mode"
                className="size-4 shrink-0 accent-[var(--color-accent)]"
                checked={restoreState?.mode === 'merge'}
                onChange={() => setRestoreState((s) => (s ? { ...s, mode: 'merge' } : s))}
              />
              Combinar — añade/actualiza sin borrar lo que ya tienes
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name="restore-mode"
                className="size-4 shrink-0 accent-[var(--color-accent)]"
                checked={restoreState?.mode === 'replace'}
                onChange={() => setRestoreState((s) => (s ? { ...s, mode: 'replace' } : s))}
              />
              Reemplazar — borra todo y deja la base de datos exactamente como en la copia
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRestoreState(null)} disabled={restoring}>
              Cancelar
            </Button>
            <Button variant={restoreState?.mode === 'replace' ? 'danger' : 'primary'} onClick={runRestore} disabled={restoring}>
              {restoring ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

function AutoBackupBlock() {
  const push = useToastStore((s) => s.push)
  // Clave para releer tras cada acción: la carpeta y la fecha viven fuera de la base de datos principal.
  const [version, setVersion] = useState(0)
  const state = useLiveQuery(async () => ({ dir: await getBackupDir(), last: await getLastBackupAt() }), [version])
  const refresh = () => setVersion((v) => v + 1)

  const [choosing, choose] = useSubmitGuard(async () => {
    try {
      const name = await chooseBackupDir()
      push({ title: 'Copia automática activada', description: `Carpeta: ${name}`, variant: 'success' })
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        push({ title: 'No se pudo usar esa carpeta', variant: 'error' })
      }
    }
    refresh()
  })
  const [copying, copyNow] = useSubmitGuard(async () => {
    try {
      await backupNowToDir()
      push({ title: 'Copia guardada en la carpeta', variant: 'success' })
    } catch {
      push({ title: 'No se pudo escribir en la carpeta', variant: 'error' })
    }
    refresh()
  })
  const disable = async () => {
    await forgetBackupDir()
    refresh()
  }

  const lastText = state?.last ? formatDistanceToNow(state.last, { addSuffix: true, locale: es }) : 'nunca'

  return (
    <div className="mb-4 rounded-md border border-border bg-bg-soft p-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden="true" />
        <span className="text-sm font-medium text-text">Copia automática</span>
        <span className="ml-auto text-xs text-text-muted">Última copia: {lastText}</span>
      </div>
      {!isAutoBackupSupported() ? (
        <p className="mt-2 text-xs text-text-muted">
          Este navegador no permite escribir en una carpeta. Descarga la copia a mano; te lo recordaremos cada {REMIND_AFTER_DAYS} días.
        </p>
      ) : state?.dir ? (
        <>
          <p className="mt-2 text-xs text-text-muted">
            Una copia al día en <span className="font-medium text-text">{state.dir.name}</span> al abrir la app; se guardan las 7 últimas.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" loading={copying} onClick={() => void copyNow()}>
              Copiar ahora
            </Button>
            <Button size="sm" variant="ghost" loading={choosing} onClick={() => void choose()}>
              Cambiar carpeta
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void disable()}>
              Desactivar
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs text-text-muted">
            Elige una carpeta (mejor si la sincroniza Drive, Dropbox u OneDrive) y Nextuss dejará allí una copia cada día.
          </p>
          <Button size="sm" className="mt-2" loading={choosing} onClick={() => void choose()}>
            <FolderOpen size={13} strokeWidth={1.75} /> Elegir carpeta
          </Button>
        </>
      )}
    </div>
  )
}
