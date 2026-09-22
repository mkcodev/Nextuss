import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Dialog, Icon } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { WEEKDAY_LABELS_ES } from '../../lib/dates'
import { DEFAULT_ICON_KEY, HABIT_ICON_KEYS } from '../../design/icons'
import type { HabitType } from '../../db/types'
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  updateHabit,
} from '../../db/repositories/habits'
import { useAttributesWithCreate } from '../gamification/useAttributesWithCreate'
import { useHabitFormStore } from './habitFormStore'

const ICON_PRESETS = HABIT_ICON_KEYS
const COLOR_PRESETS = ['#5EC8FF', '#34D399', '#FBBF24', '#FB7185', '#A78BFA', '#F472B6']
const TYPE_LABELS: Record<HabitType, string> = {
  binary: 'Sí / No',
  quantity: 'Cantidad con meta',
  duration: 'Duración',
  negative: 'A evitar',
}

/**
 * Single global instance mounted once in AppShell. The parent remounts this
 * component (via `key`) whenever the target habit changes, so local form
 * state below only ever needs to initialize once per edit/create session.
 */
export function HabitForm() {
  const { open, habit, prefillName, close } = useHabitFormStore()
  const isEdit = !!habit
  const { attributes, createAndSelect } = useAttributesWithCreate()

  const [name, setName] = useState(habit?.name ?? prefillName ?? '')
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_ICON_KEY)
  const [color, setColor] = useState(habit?.color ?? COLOR_PRESETS[0])
  const [type, setType] = useState<HabitType>(habit?.type ?? 'binary')
  const [targetValue, setTargetValue] = useState(habit?.targetValue ?? 1)
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [attributeId, setAttributeId] = useState<number | undefined>(habit?.attributeId)
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? [])
  const [newAttrName, setNewAttrName] = useState('')

  const reset = () => {
    setName('')
    setIcon(DEFAULT_ICON_KEY)
    setColor(COLOR_PRESETS[0])
    setType('binary')
    setTargetValue(1)
    setUnit('')
    setAttributeId(undefined)
    setWeekdays([])
    setNewAttrName('')
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const handleAddAttribute = async () => {
    const trimmed = newAttrName.trim()
    if (!trimmed) return
    const id = await createAndSelect(trimmed)
    setAttributeId(id)
    setNewAttrName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name: name.trim(),
      icon,
      color,
      type,
      targetValue: type === 'quantity' || type === 'duration' ? targetValue : undefined,
      unit: type === 'quantity' || type === 'duration' ? unit.trim() || undefined : undefined,
      attributeId,
      weekdays,
    }

    if (isEdit && habit?.id) {
      await updateHabit(habit.id, payload)
    } else {
      await createHabit(payload)
    }
    handleClose()
  }

  const handleArchive = async () => {
    if (!habit?.id) return
    await archiveHabit(habit.id)
    handleClose()
  }

  const handleDelete = async () => {
    if (!habit?.id) return
    if (!confirm(`¿Eliminar "${habit.name}" y todo su historial? Esto no se puede deshacer.`)) return
    await deleteHabit(habit.id)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar hábito' : 'Nuevo hábito'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Nombre</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Meditar"
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Icono</label>
          <div className="flex flex-wrap gap-1.5">
            {ICON_PRESETS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIcon(opt)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                  icon === opt
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:text-text',
                )}
              >
                <Icon name={opt} size={16} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Color</label>
          <div className="flex gap-1.5">
            {COLOR_PRESETS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setColor(opt)}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  color === opt ? 'border-text' : 'border-transparent',
                )}
                style={{ backgroundColor: opt }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Tipo</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(TYPE_LABELS) as HabitType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-left text-xs font-medium',
                  type === t ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted',
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {(type === 'quantity' || type === 'duration') && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-muted">Meta diaria</label>
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value) || 1)}
                className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-muted">Unidad</label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={type === 'duration' ? 'min' : 'vasos'}
                className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Días</label>
          <div className="flex gap-1">
            {WEEKDAY_LABELS_ES.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={cn(
                  'h-8 w-8 rounded-lg border text-xs font-medium',
                  weekdays.includes(day) || weekdays.length === 0
                    ? weekdays.includes(day)
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-text-faint'
                    : 'border-border text-text-faint',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-text-faint">
            {weekdays.length === 0 ? 'Todos los días' : `${weekdays.length} día(s) seleccionados`}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Atributo (opcional)</label>
          <select
            value={attributeId ?? ''}
            onChange={(e) => setAttributeId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Sin atributo</option>
            {attributes.map((attr) => (
              <option key={attr.id} value={attr.id}>
                {attr.name}
              </option>
            ))}
          </select>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              placeholder="Crear atributo nuevo…"
              className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <Button type="button" variant="secondary" onClick={handleAddAttribute} className="px-2.5 py-1.5 text-xs">
              Añadir
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" onClick={handleArchive} className="px-2.5 text-xs">
                Archivar
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete} className="px-2.5 text-xs">
                <Trash2 size={13} /> Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Guardar' : 'Crear hábito'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
