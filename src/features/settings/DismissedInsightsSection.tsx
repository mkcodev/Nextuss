import { useLiveQuery } from 'dexie-react-hooks'
import { Lightbulb, Undo2 } from 'lucide-react'
import { Card, EmptyState } from '../../design/primitives'
import { db } from '../../db/schema'

/** Nombre legible de cada detector (`Insight.key`). Una clave sin entrada se muestra tal cual, para
 * que un detector nuevo nunca deje una fila ilegible o rota aquí. */
const INSIGHT_LABELS: Record<string, string> = {
  weekdayEffect: 'Efecto del día de la semana',
  energyVsOutput: 'Energía frente a rendimiento',
  moodVsHabits: 'Ánimo frente a hábitos',
  bestFocusHour: 'Mejor hora de foco',
  estimateBias: 'Sesgo de estimación',
  habitAtRisk: 'Hábito en riesgo',
  zombieAccumulation: 'Tareas zombie acumuladas',
  goalCompletionRate: 'Ritmo de cumplimiento de objetivos',
  interruptionTrend: 'Tendencia de interrupciones',
  overcommitment: 'Sobrecarga de plan',
  streakFragility: 'Fragilidad de rachas',
  weekendCliff: 'Caída en fin de semana',
  newHabitStalling: 'Hábito nuevo estancado',
  recoverySpeed: 'Velocidad de recuperación',
}

/** Insights descartados con la (×) de la pestaña Insights / el dock: hasta ahora era irreversible
 * (Fase 18). Restaurar = borrar la fila de `insightFeedback`; `useInsights` lo recoge en vivo. */
export function DismissedInsightsSection() {
  // `dismissedAt` no está indexado y la tabla es diminuta: ordenar en memoria evita una migración.
  const dismissed = useLiveQuery(
    async () => (await db.insightFeedback.toArray()).sort((a, b) => b.dismissedAt - a.dismissedAt),
    [],
  )

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Lightbulb size={15} strokeWidth={1.75} /> Insights descartados
      </h2>
      <p className="mb-3 text-xs text-text-faint">Restaura uno para que vuelva a aparecer cuando se cumpla.</p>
      {dismissed != null && dismissed.length === 0 && <EmptyState icon={Lightbulb} title="No has descartado ningún insight" />}
      {dismissed != null && dismissed.length > 0 && (
        <ul className="space-y-1.5">
          {dismissed.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-text">{INSIGHT_LABELS[d.key] ?? d.key}</span>
              <span className="shrink-0 text-xs text-text-faint">
                {new Date(d.dismissedAt).toLocaleDateString('es')}
              </span>
              <button
                type="button"
                onClick={() => db.insightFeedback.delete(d.id!)}
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <Undo2 size={12} strokeWidth={2} /> Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
