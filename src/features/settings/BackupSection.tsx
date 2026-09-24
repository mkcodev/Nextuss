import { useRef, useState } from 'react'
import { Database, Download, Upload } from 'lucide-react'
import { Button, Card, Dialog } from '../../design/primitives'
import { useToastStore } from '../../lib/toastStore'
import { downloadJson } from '../stats/export'
import { dateKey } from '../../lib/dates'
import { exportDatabase, importDatabase, BackupVersionMismatchError, type ImportMode } from '../../db/backup'

/** Full-database backup/restore. Lives in Ajustes → Datos, where a user actually looks for it —
 * previously only reachable from Estadísticas → Informes, alongside the (still period-scoped,
 * separate) CSV/JSON export there. */
export function BackupSection() {
  const [restoreState, setRestoreState] = useState<{ file: File; mode: ImportMode } | null>(null)
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const push = useToastStore((s) => s.push)

  const downloadBackup = async () => {
    const backup = await exportDatabase()
    downloadJson(`nextuss-backup-${dateKey(new Date())}.json`, backup)
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
                checked={restoreState?.mode === 'merge'}
                onChange={() => setRestoreState((s) => (s ? { ...s, mode: 'merge' } : s))}
              />
              Combinar — añade/actualiza sin borrar lo que ya tienes
            </label>
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
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
