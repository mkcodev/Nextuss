import { Check, Flame, Minus, Plus, Shield } from 'lucide-react'
import { Card, Icon, IconButton, ProgressBar } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { logHabitWithFeedback } from './actions'
import type { HabitWithStats } from './useHabitsWithStats'

interface HabitCardProps {
  entry: HabitWithStats
  date: string
  onEdit?: () => void
  selected?: boolean
}

const STEP_BY_UNIT: Record<string, number> = { min: 5 }

export function HabitCard({ entry, date, onEdit, selected }: HabitCardProps) {
  const { habit, log, streak } = entry
  const value = log?.value ?? 0
  const completed = log?.completed ?? false

  const step = habit.unit ? (STEP_BY_UNIT[habit.unit] ?? 1) : 1

  const setValue = (next: number) => {
    logHabitWithFeedback(habit.id!, date, Math.max(0, next))
  }

  const toggle = () => {
    logHabitWithFeedback(habit.id!, date, completed ? 0 : 1)
  }

  return (
    <Card
      className={cn(
        'group flex items-center gap-3.5 p-3.5 transition-all hover:border-border-strong hover:shadow-card',
        completed && 'border-accent/30 bg-accent-soft/40',
        // Selección de teclado (j/k): gris de fila seleccionada, no un anillo índigo que parezca "hecho" o foco.
        selected && 'border-border-strong bg-surface-hover',
      )}
    >
      <button
        type="button"
        onClick={onEdit}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors"
        style={{
          backgroundColor: `${habit.color}14`,
          borderColor: `${habit.color}33`,
          color: habit.color,
        }}
        title="Editar hábito"
      >
        <Icon name={habit.icon} size={18} strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-text">{habit.name}</p>
          {streak.current > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-warning">
              <Flame size={12} strokeWidth={2} />
              {streak.current}
            </span>
          )}
          {log?.shieldUsed && (
            <span title="Día protegido por un escudo de racha">
              <Shield size={12} strokeWidth={2} className="shrink-0 text-accent" />
            </span>
          )}
        </div>

        {(habit.type === 'quantity' || habit.type === 'duration') && (
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar
              value={value / (habit.targetValue || 1)}
              className="h-1.5 max-w-[140px]"
            />
            <span className="text-xs tabular-nums text-text-faint">
              {value}/{habit.targetValue} {habit.unit}
            </span>
          </div>
        )}
      </div>

      {(habit.type === 'binary' || habit.type === 'negative') && (
        <IconButton
          label={habit.type === 'negative' ? 'Marcar día limpio' : 'Marcar completado'}
          active={completed}
          onClick={toggle}
          className={cn(
            'h-9 w-9 rounded-full border-2 transition-colors',
            completed
              ? 'border-accent bg-accent text-on-accent'
              : 'border-border-strong text-transparent hover:border-accent',
          )}
        >
          <Check size={16} strokeWidth={2.5} />
        </IconButton>
      )}

      {(habit.type === 'quantity' || habit.type === 'duration') && (
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="Restar" onClick={() => setValue(value - step)}>
            <Minus size={14} strokeWidth={2} />
          </IconButton>
          <span className="w-8 text-center text-sm tabular-nums text-text">{value}</span>
          <IconButton label="Sumar" onClick={() => setValue(value + step)}>
            <Plus size={14} strokeWidth={2} />
          </IconButton>
        </div>
      )}
    </Card>
  )
}
