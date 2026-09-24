import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Trash2, RotateCcw, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button, Card, EmptyState } from '../../design/primitives'
import { listTrash, purgeTrashEntry, restoreTrashEntry } from '../../db/trash'
import { useToastStore } from '../../lib/toastStore'

const TABLE_LABELS: Record<string, string> = {
  tasks: 'Tarea',
  habits: 'Hábito',
  goals: 'Objetivo',
  projects: 'Proyecto',
}

/** Papelera: lo que `trashRows` ha ido apuntando — cada fila sigue viva (`deletedAt` puesto) hasta
 * que se restaura aquí, o hasta que `runDailyMaintenance` la purga de verdad a los 30 días. */
export function TrashSection() {
  const entries = useLiveQuery(() => listTrash(), [])
  const push = useToastStore((s) => s.push)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const handleRestore = async (id: number, label: string) => {
    await restoreTrashEntry(id)
    push({ title: `Restaurado: ${label}`, variant: 'success' })
  }

  const handlePurge = async (id: number, label: string) => {
    setConfirmingId(null)
    await purgeTrashEntry(id)
    push({ title: `Eliminado para siempre: ${label}`, variant: 'default' })
  }

  return (
    <Card id="papelera" className="p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Trash2 size={15} strokeWidth={1.75} /> Papelera
      </h3>
      <p className="mb-3 text-xs text-text-faint">
        Tareas, hábitos y objetivos eliminados. Se purgan solos a los 30 días.
      </p>
      {entries != null && entries.length === 0 && (
        <EmptyState icon={Trash2} title="La papelera está vacía" />
      )}
      {entries != null && entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-soft px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-text">{entry.label}</p>
                <p className="text-xs text-text-faint">
                  {TABLE_LABELS[entry.table] ?? entry.table} · {format(entry.deletedAt, "d MMM yyyy, HH:mm", { locale: es })}
                  {entry.entityIds.length > 1 ? ` · ${entry.entityIds.length} elementos` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" onClick={() => void handleRestore(entry.id!, entry.label)} className="px-2 text-xs">
                  <RotateCcw size={13} strokeWidth={1.75} /> Restaurar
                </Button>
                {confirmingId === entry.id ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => void handlePurge(entry.id!, entry.label)}
                      className="px-2 text-xs text-danger"
                      aria-label="Confirmar eliminar para siempre"
                    >
                      <Check size={13} strokeWidth={2} /> ¿Seguro?
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmingId(null)} className="px-2 text-xs" aria-label="Cancelar">
                      <X size={13} strokeWidth={1.75} />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onClick={() => setConfirmingId(entry.id!)} className="px-2 text-xs text-danger">
                    <X size={13} strokeWidth={1.75} /> Eliminar ya
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
