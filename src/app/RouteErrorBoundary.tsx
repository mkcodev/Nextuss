import { useRouteError } from 'react-router-dom'
import { useState } from 'react'
import { AlertTriangle, Download, RefreshCw } from 'lucide-react'
import { Button } from '../design/primitives'
import { exportDatabase } from '../db/backup'
import { downloadJson } from '../features/stats/export'

function messageFor(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Error desconocido.'
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleBackup() {
    setSaving(true)
    try {
      const payload = await exportDatabase()
      downloadJson(`nexus-backup-emergencia-${Date.now()}.json`, payload)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <AlertTriangle size={40} className="text-danger" strokeWidth={1.75} />
      <h1 className="text-lg font-semibold text-text">Algo se rompió</h1>
      <p className="max-w-md text-sm text-text-muted">
        Nexus encontró un error inesperado al mostrar esta página. Tus datos siguen intactos en tu
        dispositivo — puedes descargar una copia de seguridad antes de recargar.
      </p>
      <p className="max-w-md truncate text-xs text-text-faint">{messageFor(error)}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleBackup} disabled={saving}>
          <Download size={16} strokeWidth={1.75} />
          {saved ? 'Copia descargada' : saving ? 'Generando…' : 'Descargar copia de seguridad'}
        </Button>
        <Button onClick={() => window.location.assign('/')}>
          <RefreshCw size={16} strokeWidth={1.75} />
          Recargar Nexus
        </Button>
      </div>
    </div>
  )
}
