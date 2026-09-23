import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Star } from 'lucide-react'
import { cn } from '../../lib/cn'
import { getCheckInForDate, upsertCheckIn } from '../../db/repositories/checkins'
import { Textarea } from '../../design/primitives'
import { useToastStore } from '../../lib/toastStore'

type Field = 'energy' | 'mood' | 'focus'

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
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
              className={value != null && n <= value ? 'fill-accent text-accent' : 'text-text-faint'}
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Check-in de un día: energía/ánimo/foco (1-5, sin responder = `null`, nunca se fabrica un
 * valor por defecto) + nota libre. Auto-contenido — solo necesita `date`, hace su propia
 * `useLiveQuery`/escritura, así que puede montarse tal cual en la tarjeta de Hoy y en el paso 1
 * del flujo de inicio del día sin duplicar lógica.
 */
export function CheckInFields({ date }: { date: string }) {
  const checkin = useLiveQuery(() => getCheckInForDate(date), [date])
  const [note, setNote] = useState<string | null>(null)
  const noteValue = note ?? checkin?.note ?? ''
  const push = useToastStore((s) => s.push)

  const setRating = async (field: Field, value: number) => {
    try {
      await upsertCheckIn(date, { [field]: value })
    } catch {
      push({ title: 'No se pudo guardar el check-in', variant: 'error' })
    }
  }

  const commitNote = async () => {
    if (note === null) return
    try {
      await upsertCheckIn(date, { note: note.trim() || undefined })
    } catch {
      push({ title: 'No se pudo guardar el check-in', variant: 'error' })
    }
  }

  const answered = checkin?.energy != null || checkin?.mood != null || checkin?.focus != null

  return (
    <div className="space-y-3">
      <p className={cn('text-[11px]', answered ? 'text-accent' : 'text-text-faint')}>
        {answered ? 'Check-in guardado.' : 'Todavía no has hecho el check-in.'}
      </p>
      <RatingRow label="Energía" value={checkin?.energy ?? null} onChange={(v) => setRating('energy', v)} />
      <RatingRow label="Ánimo" value={checkin?.mood ?? null} onChange={(v) => setRating('mood', v)} />
      <RatingRow label="Foco" value={checkin?.focus ?? null} onChange={(v) => setRating('focus', v)} />
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
