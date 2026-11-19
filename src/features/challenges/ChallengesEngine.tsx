// Motor del plugin Retos (#191). No pinta nada: mantiene los retos al día mientras el plugin está
// encendido (solo se monta entonces, ver `PluginEngines.tsx`).
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { readMissionSnapshot, syncMissionProgress } from '../../db/repositories/challengeMissions'
import { todayKey } from '../../lib/dates'
import { on } from '../../lib/events/bus'
import { runChallengesDaily } from './kinds'

export function ChallengesEngine() {
  const [today, setToday] = useState(todayKey)

  // El reloj de la app avisa cada 30 s con su `date` (00:00 local): solo reacciona cuando cambia el día.
  useEffect(() => on('clock.tick', ({ date }) => setToday((prev) => (prev === date ? prev : date))), [])

  // Al montarse y en cada cambio de día: cerrar, reconciliar y generar. Idempotente.
  useEffect(() => {
    void runChallengesDaily({ today })
  }, [today])

  // Progreso de las misiones de hoy. La consulta lee tareas, foco, check-in y registros de hábitos;
  // nunca `challenges`, porque `syncMissionProgress` escribe ahí y entraría en bucle.
  const snapshot = useLiveQuery(() => readMissionSnapshot(today), [today])
  useEffect(() => {
    if (snapshot) void syncMissionProgress(today, snapshot)
  }, [snapshot, today])

  return null
}
