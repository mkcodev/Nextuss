import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Star } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { todayKey } from '../../../lib/dates'
import { getCheckInForDate, upsertCheckIn } from '../../../db/repositories/checkins'
import { Textarea } from '../../../design/primitives'
import { useToastStore } from '../../../lib/toastStore'

type Field = 'energy' | 'mood' | 'focus'

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between" role="radiogroup" aria-label={label}>
      <span className="text-xs text-text-muted">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} de 5`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star
              size={14}
              strokeWidth={1.75}
              className={n <= value ? 'fill-accent text-accent' : 'text-text-faint'}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

export function CheckInPanel() {
  const date = todayKey()
  const checkin = useLiveQuery(() => getCheckInForDate(date), [date])
  const [note, setNote] = useState<string | null>(null)

  const energy = checkin?.energy ?? 0
  const mood = checkin?.mood ?? 0
  const focus = checkin?.focus ?? 0
  const noteValue = note ?? checkin?.note ?? ''

  const push = useToastStore((s) => s.push)

  const setRating = async (field: Field, value: number) => {
    try {
      await upsertCheckIn(date, {
        energy: field === 'energy' ? value : energy || 3,
        mood: field === 'mood' ? value : mood || 3,
        focus: field === 'focus' ? value : focus || 3,
        note: noteValue.trim() || undefined,
      })
    } catch {
      push({ title: 'No se pudo guardar el check-in', variant: 'error' })
    }
  }

  const commitNote = async () => {
    if (note === null) return
    try {
      await upsertCheckIn(date, {
        energy: energy || 3,
        mood: mood || 3,
        focus: focus || 3,
        note: note.trim() || undefined,
      })
    } catch {
      push({ title: 'No se pudo guardar el check-in', variant: 'error' })
    }
  }

  return (
    <div className="space-y-3">
      <p className={cn('text-[11px]', checkin ? 'text-accent' : 'text-text-faint')}>
        {checkin ? 'Check-in de hoy guardado.' : 'Todavía no has hecho el check-in de hoy.'}
      </p>
      <RatingRow label="Energía" value={energy} onChange={(v) => setRating('energy', v)} />
      <RatingRow label="Ánimo" value={mood} onChange={(v) => setRating('mood', v)} />
      <RatingRow label="Foco" value={focus} onChange={(v) => setRating('focus', v)} />
      <Textarea
        value={noteValue}
        onChange={(e) => setNote(e.target.value)}
        onBlur={commitNote}
        placeholder="¿Cómo ha ido el día? (opcional)"
        rows={3}
        className="resize-none"
      />
    </div>
  )
}
