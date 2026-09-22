import { useEffect, useState } from 'react'
import { Loader2, Sparkles, Trash2 } from 'lucide-react'
import { Button, Dialog } from '../../design/primitives'
import { createTask, getTasksForRange } from '../../db/repositories/tasks'
import { buildEstimateAccuracy } from '../stats/aggregate'
import { breakdownTask, type Subtask } from './prompts'
import { AiError, recordAiUsage } from './client'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { dateKey } from '../../lib/dates'
import { subDays } from 'date-fns'
import { useTaskBreakdownStore } from './taskBreakdownStore'

/** Montado una vez en AppShell — ver `taskBreakdownStore.ts` sobre por qué no vive anidado dentro
 * del `Dialog` de `TaskForm`. */
export function TaskBreakdownDialog() {
  const { open, parentTaskId, title, notes, close: onClose } = useTaskBreakdownStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function run() {
      setError(null)
      setSubtasks([])
      setLoading(true)
      const settings = await getOrCreateSettings()
      const apiKey = settings.claudeApiKey?.trim()
      if (!apiKey) {
        if (!cancelled) {
          setError('No hay clave de API configurada en Ajustes.')
          setLoading(false)
        }
        return
      }
      try {
        // Últimos 6 meses de tareas cerradas, la misma señal que 4.1's precisión de estimación.
        const to = dateKey()
        const from = dateKey(subDays(new Date(), 180))
        const recentTasks = await getTasksForRange(from, to)
        const bias = buildEstimateAccuracy(recentTasks)
        const result = await breakdownTask(apiKey, { title, notes }, bias)
        if (cancelled) return
        setSubtasks(result)
        void recordAiUsage(settings)
      } catch (err) {
        if (!cancelled) setError(err instanceof AiError ? err.message : 'Error inesperado al desglosar la tarea.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open, title, notes])

  const updateSubtask = (i: number, changes: Partial<Subtask>) =>
    setSubtasks((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...changes } : s)))

  const removeSubtask = (i: number) => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))

  const handleCreate = async () => {
    if (parentTaskId == null) return
    setCreating(true)
    try {
      for (const s of subtasks) {
        if (!s.title.trim()) continue
        await createTask({ title: s.title.trim(), estimateMin: s.estimateMin, parentId: parentTaskId, status: 'backlog' })
      }
      onClose()
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Desglosar con IA">
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" /> Pensando el desglose…
          </div>
        )}

        {error && !loading && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        {!loading && !error && subtasks.length > 0 && (
          <>
            <p className="text-xs text-text-faint">Revisa y edita antes de crear — nada se guarda todavía.</p>
            <ul className="space-y-2">
              {subtasks.map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                  <input
                    value={s.title}
                    onChange={(e) => updateSubtask(i, { title: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none"
                  />
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={s.estimateMin}
                    onChange={(e) => updateSubtask(i, { estimateMin: Number(e.target.value) || 5 })}
                    className="w-16 shrink-0 rounded-md border border-border bg-bg-soft px-1.5 py-1 text-right text-xs text-text outline-none focus:border-accent"
                  />
                  <span className="shrink-0 text-[10px] text-text-faint">min</span>
                  <button type="button" onClick={() => removeSubtask(i)} className="shrink-0 text-text-faint hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {!loading && !error && (
            <Button type="button" onClick={handleCreate} disabled={creating || subtasks.length === 0}>
              <Sparkles size={14} strokeWidth={1.75} /> Crear {subtasks.length} subtarea{subtasks.length === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
