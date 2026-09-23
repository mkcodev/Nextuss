// Mantenimiento diario — un único punto de entrada llamado una vez por sesión desde `main.tsx`,
// tras `ensureSingletons()`. Antes de esto, `reconcileShields()` colgaba de `TodayView.tsx` y por
// tanto no se ejecutaba nunca si el usuario entraba directo a `/planificacion`; ahora se ejecuta
// siempre, entre por donde entre. También purga la papelera pasados 30 días, y rellena el horizonte
// de 28 días de toda regla de recurrencia en modo `schedule` (Fase 9).
import { reconcileShields } from './repositories/habits'
import { purgeExpiredTrash } from './trash'
import { generateUpcomingOccurrences } from './repositories/recurrence'
import { dateKey } from '../lib/dates'

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export async function runDailyMaintenance(today: Date = new Date()): Promise<void> {
  await reconcileShields(today)
  await purgeExpiredTrash(today.getTime(), TRASH_RETENTION_MS)
  await generateUpcomingOccurrences(dateKey(today))
}
