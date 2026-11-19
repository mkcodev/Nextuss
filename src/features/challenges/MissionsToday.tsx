import { useId } from 'react'
import { Check } from 'lucide-react'
import { ProgressBar, Skeleton } from '../../design/primitives'
import { MISSION_XP } from '../../lib/challenges/missionCatalog'
import { MISSION_SOURCE_LABEL, missionFraction, missionProgressText } from '../../lib/challenges/missionLabels'
import type { ChallengesData, MissionItem } from './challengesData'

/** «Misiones de hoy»: de 1 a 3 que salen de lo que ya haces (tareas, foco, check-in, hábitos). Se
 *  cumplen solas al darse el dato, así que no hay nada que pulsar: si se cumple en otra pantalla
 *  aparece como cumplida, sin celebración. */
export function MissionsToday({ data, gamified }: { data: ChallengesData | undefined; gamified: boolean }) {
  const titleId = useId()
  const done = data?.missions.filter((m) => m.challenge.status === 'done').length ?? 0

  return (
    <section aria-labelledby={titleId} className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-sm font-semibold text-text">
          Misiones de hoy
        </h2>
        {data && data.missions.length > 0 && (
          <p className="text-xs tabular-nums text-text-muted">
            {done} de {data.missions.length} cumplidas
          </p>
        )}
      </div>

      {data === undefined ? (
        <div aria-hidden="true" className="space-y-2">
          <Skeleton className="h-[62px] w-full" />
          <Skeleton className="h-[62px] w-full" />
        </div>
      ) : data.missions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong p-4 text-ui text-pretty text-text-muted">
          {data.hadMissions ? (
            'Hoy no hay misiones: salen de tus tareas, foco, check-in y hábitos.'
          ) : (
            <>
              <strong className="font-semibold text-text">Tus primeras misiones llegan mañana.</strong> Salen de lo que ya haces en Nextuss:
              tareas, foco, check-in y hábitos. Hoy aún no hay datos con los que proponerlas.
            </>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {data.missions.map((m) => (
            <MissionRow key={m.challenge.id} mission={m} gamified={gamified} />
          ))}
        </ul>
      )}

      <p className="text-xs text-text-muted">Se renuevan a las 00:00.</p>
    </section>
  )
}

function MissionRow({ mission, gamified }: { mission: MissionItem; gamified: boolean }) {
  const { challenge, params } = mission
  const complete = challenge.status === 'done'
  const xp = complete ? challenge.xpAwarded : MISSION_XP[params.template]

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {/* Hecha = círculo relleno con check; pendiente = círculo vacío. Además va el texto «Cumplida». */}
      <span
        aria-hidden="true"
        className={
          complete
            ? 'grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent'
            : 'size-5 shrink-0 rounded-full border-2 border-border-strong'
        }
      >
        {complete && <Check size={12} strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-ui font-medium text-text">{challenge.title}</p>
          <span className="rounded-xs bg-surface-hover px-1.5 text-2xs font-medium text-text-muted">{MISSION_SOURCE_LABEL[params.source]}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <ProgressBar value={missionFraction(params)} className="min-w-0 max-w-48 flex-1" />
          <span className="shrink-0 text-xs whitespace-nowrap tabular-nums text-text-muted">{missionProgressText(params)}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
        {complete && (
          <span className="inline-flex items-center gap-1 font-medium text-accent-text">
            <Check size={12} strokeWidth={2.5} aria-hidden="true" />
            Cumplida
          </span>
        )}
        {gamified && xp > 0 && <span className="tabular-nums text-text-muted">+{xp} XP</span>}
      </div>
    </li>
  )
}
