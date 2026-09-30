import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { Button, Select, Input } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { AI_MODEL_OPTIONS, resolveAiModel } from './errors'
import type { AiModel } from '../../db/types'

/** Clave de la API de Anthropic, modelo y uso — pieza a medida (#98 P5): la clave es un secreto que hay
 * que poder mostrar/ocultar y probar antes de guardarla. */
export function AiSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [keyDraft, setKeyDraft] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const key = keyDraft ?? settings?.claudeApiKey ?? ''
  const model = resolveAiModel(settings?.aiModel)

  const commitKey = () => {
    if (keyDraft === null) return
    updateSettings({ claudeApiKey: keyDraft.trim() || undefined })
    setTestResult(null)
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { testAiConnection } = await import('./client')
      const result = await testAiConnection(key.trim(), model)
      setTestResult(result.ok ? { ok: true } : { ok: false, message: result.message })
    } catch {
      setTestResult({ ok: false, message: 'No se pudo cargar el módulo de IA. Comprueba tu conexión.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-3 py-2.5">
      <p className="text-xs text-text-faint">
        Desglose de tareas, captura en lenguaje natural, resumen semanal y sugerencia de plan del día, usando tu propia clave de la API de Anthropic. Sin clave, estas funciones se ocultan.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Clave de API</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKeyDraft(e.target.value)}
              onBlur={commitKey}
              placeholder="sk-ant-…"
              className="!px-3 !py-2 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={runTest} disabled={testing || !key.trim()}>
            {testing ? 'Probando…' : 'Probar conexión'}
          </Button>
        </div>
        {testResult && (
          <p className={cn('mt-2 text-xs', testResult.ok ? 'text-success' : 'text-danger')}>
            {testResult.ok ? 'Conexión correcta.' : testResult.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">Modelo</label>
        <Select value={model} onChange={(e) => updateSettings({ aiModel: e.target.value as AiModel })}>
          {AI_MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} · {opt.priceHint}
            </option>
          ))}
        </Select>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-warning">
        <TriangleAlert size={13} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        La clave se guarda en texto plano en este navegador (IndexedDB), sin cifrar. No la compartas si usas un equipo compartido.
      </p>

      <p className="text-xs text-text-faint">Peticiones hechas desde esta app: {settings?.aiUsageCount ?? 0}</p>
    </div>
  )
}
