import { Flag, Plus } from 'lucide-react'
import { Button, Kbd } from '../../design/primitives'
import { CHALLENGE_TEMPLATES } from '../../lib/challenges/templates'
import { DayMark } from './DayMark'
import { useChallengeFormStore } from './challengeFormStore'

const GHOST_DAYS = 30

/** Cuando no hay retos propios en marcha. Con `compact` (ya hay terminados) se omite la explicación
 *  larga y la cadena fantasma: solo la invitación y las plantillas. */
export function ChallengesEmpty({ compact = false }: { compact?: boolean }) {
  const openCreate = useChallengeFormStore((s) => s.openCreate)

  return (
    <div className="rounded-lg border border-dashed border-border-strong p-5">
      <div className="flex flex-col items-start gap-1.5">
        <div className="mb-1.5 grid size-9 place-items-center rounded-md bg-surface-hover text-text-muted">
          <Flag size={18} strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h3 className="text-ui font-semibold text-balance text-text">{compact ? 'No tienes retos en marcha' : 'Tu primera cadena empieza hoy'}</h3>
        <p className="max-w-md text-ui text-pretty text-text-muted">
          {compact
            ? 'Empieza otro cuando quieras.'
            : 'Un reto propio es algo que marcas cada día durante un tiempo fijo. Los escudos cubren los días que se te escapen, sin romper la racha.'}
        </p>
      </div>

      {!compact && (
        <ol aria-hidden="true" className="mt-4 flex flex-wrap gap-1">
          {Array.from({ length: GHOST_DAYS }, (_, i) => (
            <li key={i}>
              <DayMark visual={i === 0 ? 'today' : 'upcoming'} size="md" />
            </li>
          ))}
        </ol>
      )}

      <h4 className="mt-5 mb-2 text-xs font-medium text-text-muted">Empieza con una plantilla</h4>
      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
        {CHALLENGE_TEMPLATES.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-ui font-medium text-text">{t.title}</p>
              <p className="text-xs tabular-nums text-text-muted">
                {t.days} días · {t.shields} {t.shields === 1 ? 'escudo' : 'escudos'}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => openCreate({ text: t.title, days: t.days, shields: t.shields })}>
              Usar<span className="sr-only"> la plantilla «{t.title}»</span>
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button onClick={() => openCreate()}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" /> Nuevo reto <Kbd className="bg-on-accent/20 text-on-accent">c</Kbd>
        </Button>
        <span className="text-xs text-text-muted">o escribe el tuyo desde cero</span>
      </div>
    </div>
  )
}
