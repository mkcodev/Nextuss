import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Repeat } from 'lucide-react'
import { Button, Card, EmptyState } from '../../design/primitives'
import { listRecurrenceRules, stopRecurrence } from '../../db/repositories/recurrence'
import { describeRecurrence } from '../../lib/recurrence'
import { formatShortDate } from '../../lib/dates'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

/** Tareas que se repiten (Fase 18): hasta ahora solo se podían ver o parar abriendo una de sus
 *  ocurrencias. Aquí se ven todas y se paran con confirmación (es irreversible). */
export function RecurrenceSection() {
  const rules = useLiveQuery(async () => (await listRecurrenceRules()).sort((a, b) => a.title.localeCompare(b.title, 'es')), [])
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [, stop] = useSubmitGuard(async (id: number) => {
    await stopRecurrence(id)
    setConfirmingId(null)
  })

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Repeat size={15} strokeWidth={1.75} aria-hidden="true" /> Tareas que se repiten
      </h2>
      <p className="mb-3 text-sm text-text-muted">
        Dejar de repetir quita las próximas ocurrencias; las ya creadas se quedan como tareas normales.
      </p>
      {rules != null && rules.length === 0 && (
        <EmptyState icon={Repeat} title="Ninguna tarea se repite" description="Activa Repetir en Más opciones al crear una tarea." />
      )}
      {rules != null && rules.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{r.title}</p>
                <p className="text-xs text-text-muted">
                  {describeRecurrence(r)}
                  {r.until && ` · hasta el ${formatShortDate(r.until)}`}
                </p>
              </div>
              {confirmingId === r.id ? (
                <div role="group" aria-label={`Confirmar dejar de repetir "${r.title}"`} className="flex items-center gap-1.5">
                  <span className="text-text">¿Seguro?</span>
                  <Button size="sm" variant="ghost" autoFocus onClick={() => setConfirmingId(null)}>
                    No
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void stop(r.id!)}>
                    Sí, dejar de repetir
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmingId(r.id!)} aria-label={`Dejar de repetir "${r.title}"`}>
                  Dejar de repetir
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
