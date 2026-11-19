import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { todayKey } from '../../lib/dates'
import { on } from '../../lib/events/bus'
import { buildChallengesData, type ChallengesData } from './challengesData'

/** La clave de hoy (00:00 local), que cambia sola al pasar la medianoche: el reloj de la app avisa
 * cada 30 s y solo reacciona cuando cambia el día (como `ChallengesEngine`). */
export function useChallengesToday(): string {
  const [today, setToday] = useState(todayKey)
  useEffect(() => on('clock.tick', ({ date }) => setToday((prev) => (prev === date ? prev : date))), [])
  return today
}

/** Misiones de hoy y retos propios, en vivo. `undefined` mientras carga. */
export function useChallengesData(today: string): ChallengesData | undefined {
  return useLiveQuery(async () => {
    const [rows, days] = await Promise.all([db.challenges.toArray(), db.challengeDays.toArray()])
    return buildChallengesData(rows, days, today)
  }, [today])
}
