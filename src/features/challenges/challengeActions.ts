// Acciones de la página /retos: llaman al repositorio y dejan un aviso con «Deshacer» (mismo patrón que
// `togglePluginWithUndo`). Un rechazo del repositorio (`ChallengeActionError`) se enseña tal cual en un
// aviso de error y no rompe nada. «Eliminar» usa `trashChallenge`, que ya deja su propio aviso.
import {
  ChallengeActionError,
  abandonChallenge,
  markChallengeDay,
  type MarkResult,
  pauseChallenge,
  resumeChallenge,
  skipChallengeDay,
  trashChallenge,
  undoSkipChallengeDay,
  unmarkChallengeDay,
} from '../../db/repositories/challenges'
import { ACHIEVEMENTS_BY_KEY } from '../../lib/achievements'
import { useToastStore, type Toast } from '../../lib/toastStore'
import { useUndoStore } from '../../lib/undoStore'

const toast = () => useToastStore.getState()

/** Ejecuta `fn`; si el repositorio la rechaza, lo cuenta en un aviso de error y devuelve `false`. */
async function guarded(fn: () => Promise<boolean | void>): Promise<boolean> {
  try {
    return (await fn()) !== false
  } catch (e) {
    if (e instanceof ChallengeActionError) {
      toast().push({ title: e.message, variant: 'error' })
    } else {
      console.error('[retos] acción fallida', e)
      toast().push({ title: 'No se pudo completar la acción.', variant: 'error' })
    }
    return false
  }
}

/** El deshacer de un aviso puede llegar tarde (cambió el día, el reto ya terminó): entonces no hay nada
 * que deshacer y no debe romper. */
const quietly = (fn: () => Promise<unknown>) => async () => {
  try {
    await fn()
  } catch (e) {
    if (!(e instanceof ChallengeActionError)) throw e
  }
}

function withUndo(
  label: string,
  title: string,
  description: string | undefined,
  undo: () => Promise<unknown>,
  redo: () => Promise<unknown>,
  look: Pick<Toast, 'icon' | 'variant'> = {},
) {
  const undoId = useUndoStore.getState().push({ label, undo: quietly(undo), redo: quietly(redo) })
  toast().push({
    title,
    description,
    ...look,
    action: { label: 'Deshacer', onClick: () => void useUndoStore.getState().undoEntry(undoId) },
  })
}

/** El texto del aviso de «Reto cumplido»: duración, si fue sin fallos y el bonus (solo con gamificación). */
export function finishedDescription(title: string, f: NonNullable<MarkResult['finished']>): string {
  const parts = [`${title} · ${f.durationDays} ${f.durationDays === 1 ? 'día' : 'días'}`]
  if (f.perfect) parts.push('sin ningún fallo')
  if (f.bonus > 0) parts.push(`+${f.bonus} XP`)
  return parts.join(' · ')
}

/** Marca hoy como hecho. Devuelve `true` si lo marcó. Si era el último día, el reto se cierra en ese
 * momento: el aviso es el de «Reto cumplido» (con «Deshacer», que lo reabre) y, si desbloquea logros,
 * cada uno saca el suyo. */
export function markToday(id: number, title: string, today: string): Promise<boolean> {
  return guarded(async () => {
    const result = await markChallengeDay(id, today)
    const undo = () => unmarkChallengeDay(id, today)
    const redo = () => markChallengeDay(id, today)
    if (result.finished) {
      withUndo(`Reto cumplido · ${title}`, 'Reto cumplido', finishedDescription(title, result.finished), undo, redo, { icon: 'flag', variant: 'celebrate' })
    } else {
      withUndo(`Marcar hoy · ${title}`, 'Hoy marcado', title, undo, redo)
    }
    for (const key of result.unlockedAchievements) {
      const def = ACHIEVEMENTS_BY_KEY.get(key)
      if (def) toast().push({ title: def.title, description: def.description, icon: def.icon })
    }
  })
}

/** Quita la marca de hoy. Devuelve `true` si la quitó. */
export function unmarkToday(id: number, title: string, today: string): Promise<boolean> {
  return guarded(async () => {
    await unmarkChallengeDay(id, today)
    withUndo(`Quitar la marca de hoy · ${title}`, 'Marca de hoy quitada', title, () => markChallengeDay(id, today), () => unmarkChallengeDay(id, today))
  })
}

/** «Hoy no»: gasta un escudo a propósito. */
export function skipToday(id: number, title: string, today: string): Promise<boolean> {
  return guarded(async () => {
    await skipChallengeDay(id, today)
    withUndo(`«Hoy no» · ${title}`, '«Hoy no»: gastas 1 escudo', title, () => undoSkipChallengeDay(id, today), () => skipChallengeDay(id, today))
  })
}

/** Quita el «Hoy no» de hoy: el escudo vuelve. */
export function undoSkipToday(id: number, title: string, today: string): Promise<boolean> {
  return guarded(async () => {
    await undoSkipChallengeDay(id, today)
    withUndo(`Quitar «Hoy no» · ${title}`, '«Hoy no» quitado: el escudo vuelve', title, () => skipChallengeDay(id, today), () => undoSkipChallengeDay(id, today))
  })
}

/** Pausa el reto desde mañana (hoy sigue contando). */
export function pauseNow(id: number, title: string, today: string): Promise<boolean> {
  return guarded(async () => {
    if (!(await pauseChallenge(id, today, 'user'))) {
      toast().push({ title: 'No se puede pausar: este reto termina hoy.', variant: 'error' })
      return false
    }
    withUndo(`Pausar · ${title}`, 'Reto en pausa desde mañana', title, () => resumeChallenge(id, today), () => pauseChallenge(id, today, 'user'))
  })
}

/** Reanuda el reto. Los días pausados ya alargaron su fecha de fin, así que no hay «Deshacer». */
export function resumeNow(id: number, title: string, today: string): Promise<boolean> {
  return guarded(async () => {
    if (!(await resumeChallenge(id, today))) {
      toast().push({ title: 'Este reto no está en pausa.', variant: 'error' })
      return false
    }
    toast().push({ title: 'Reto reanudado', description: title })
  })
}

/** Abandona el reto: conserva su historial y el XP y no se puede retomar (por eso la página pide
 * confirmación antes y no hay «Deshacer»). */
export function abandonNow(id: number, title: string): Promise<boolean> {
  return guarded(async () => {
    await abandonChallenge(id)
    toast().push({ title: 'Reto abandonado', description: `${title}. Se queda en tu historial.` })
  })
}

/** A la papelera, con su aviso y «Deshacer». */
export function trashNow(id: number): Promise<boolean> {
  return guarded(() => trashChallenge(id))
}
