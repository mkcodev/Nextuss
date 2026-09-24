import { useState } from 'react'
import { Button, Dialog, Field } from '../../design/primitives'
import { parseDateKey, todayKey } from '../../lib/dates'
import { logFocusSession } from '../../db/repositories/focusSessions'
import { useToastStore } from '../../lib/toastStore'
import { useLogTimeStore } from './logTimeStore'

/** "Registrar tiempo" (Fase 13.4) — registro manual sin correr ningún timer: escribe una
 * `FocusSession` retroactiva (misma tabla/forma que una sesión de foco real) vía `logFocusSession`,
 * que ya encadena `addActualMinutes` — cero repositorio nuevo. Deliberadamente no toca
 * `focusTimerStore`/`cycle.ts`. Único diálogo global (montado en AppShell), mismo patrón que
 * `ProjectForm`/`TaskForm`. */
export function LogTimeDialog() {
  const { open, task, close } = useLogTimeStore()
  const push = useToastStore((s) => s.push)

  const [minutes, setMinutes] = useState(30)
  const [date, setDate] = useState(todayKey())

  const handleClose = () => {
    setMinutes(30)
    setDate(todayKey())
    close()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task?.id || minutes <= 0) return
    const start = parseDateKey(date)
    start.setHours(12, 0, 0, 0)
    const end = start.getTime() + minutes * 60_000
    await logFocusSession({ taskId: task.id, start: start.getTime(), end, durationMin: minutes, interruptions: 0 })
    push({ title: 'Tiempo registrado', description: `${minutes} min en "${task.title}"`, variant: 'success' })
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Registrar tiempo">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-text-faint">
          Añade tiempo ya trabajado en <span className="text-text-muted">"{task?.title}"</span> sin
          iniciar el temporizador. Cuenta igual que una sesión de foco real en las estadísticas.
        </p>

        <Field label="Minutos">
          {(inputProps) => (
            <input
              {...inputProps}
              autoFocus
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          )}
        </Field>

        <Field label="Fecha">
          {(inputProps) => (
            <input
              {...inputProps}
              type="date"
              max={todayKey()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
            />
          )}
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={minutes <= 0}>
            Registrar
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
