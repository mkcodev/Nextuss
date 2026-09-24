// Router de comandos entrantes de Telegram (Fase 5.5). Texto suelto sin comando reconocido cae a
// `QuickNote` sin triar — el mismo flujo de captura que ya existe en `CapturePanel`.
import { db } from '../../db/schema'
import { createQuickNote } from '../../db/repositories/quickNotes'
import { createTask, getTasksForDate, toggleTaskDone } from '../../db/repositories/tasks'
import { listHabits, getLogsForDate, setHabitLog } from '../../db/repositories/habits'
import { isHabitScheduledOn, parseDateKey } from '../../lib/dates'

export interface CommandResult {
  reply: string
}

async function todaysOpenTasks(today: string) {
  const tasks = await getTasksForDate(today)
  return tasks.filter((t) => t.status !== 'done').sort((a, b) => (a.scheduledStart ?? '99:99').localeCompare(b.scheduledStart ?? '99:99'))
}

async function todaysScheduledHabits(today: string) {
  const habits = await listHabits()
  return habits.filter((h) => isHabitScheduledOn(h, parseDateKey(today)))
}

async function replyHoy(today: string): Promise<CommandResult> {
  const tasks = await todaysOpenTasks(today)
  if (tasks.length === 0) return { reply: 'Sin tareas pendientes para hoy.' }
  const lines = tasks.map((t, i) => `${i + 1}. ${t.title}${t.scheduledStart ? ` (${t.scheduledStart})` : ''}`)
  return { reply: `Tareas de hoy:\n${lines.join('\n')}\n\nUsa /hecho <n> para marcar una como hecha.` }
}

async function replyAdd(text: string): Promise<CommandResult> {
  const title = text.trim()
  if (!title) return { reply: 'Uso: /add <texto de la tarea>' }
  await createTask({ title })
  return { reply: `Tarea creada: ${title}` }
}

async function replyNota(text: string): Promise<CommandResult> {
  const trimmed = text.trim()
  if (!trimmed) return { reply: 'Uso: /nota <texto>' }
  await createQuickNote(trimmed)
  return { reply: 'Nota guardada en captura rápida.' }
}

async function replyHecho(arg: string, today: string): Promise<CommandResult> {
  const n = Number(arg.trim())
  const tasks = await todaysOpenTasks(today)
  const task = Number.isInteger(n) ? tasks[n - 1] : undefined
  if (!task?.id) return { reply: `No encuentro la tarea #${arg.trim()}. Prueba /hoy para ver la lista.` }
  await toggleTaskDone(task.id)
  return { reply: `Hecho: ${task.title}` }
}

async function replyHabitos(today: string): Promise<CommandResult> {
  const scheduled = await todaysScheduledHabits(today)
  if (scheduled.length === 0) return { reply: 'Sin hábitos programados para hoy.' }
  const logs = await getLogsForDate(today)
  const byHabit = new Map(logs.map((l) => [l.habitId, l]))
  const lines = scheduled.map((h, i) => `${i + 1}. ${byHabit.get(h.id!)?.completed ? '[x]' : '[ ]'} ${h.name}`)
  return { reply: `Hábitos de hoy:\n${lines.join('\n')}\n\nUsa /habito <n> para marcar uno como hecho.` }
}

async function replyHabito(arg: string, today: string): Promise<CommandResult> {
  const n = Number(arg.trim())
  const scheduled = await todaysScheduledHabits(today)
  const habit = Number.isInteger(n) ? scheduled[n - 1] : undefined
  if (!habit?.id) return { reply: `No encuentro el hábito #${arg.trim()}. Prueba /habitos.` }
  await setHabitLog(habit.id, today, 1)
  return { reply: `Registrado: ${habit.name}` }
}

async function replyStats(today: string): Promise<CommandResult> {
  const [progress, scheduled, logs] = await Promise.all([db.progress.get(1), todaysScheduledHabits(today), getLogsForDate(today)])
  const done = logs.filter((l) => l.completed).length
  return { reply: `Nivel ${progress?.level ?? 1} · ${progress?.totalXp ?? 0} XP\nHábitos de hoy: ${done}/${scheduled.length}` }
}

function replyAyuda(): CommandResult {
  return {
    reply:
      'Comandos:\n' +
      '/hoy — tareas pendientes de hoy\n' +
      '/add <texto> — crear tarea\n' +
      '/nota <texto> — guardar nota rápida\n' +
      '/hecho <n> — marcar la tarea #n de /hoy como hecha\n' +
      '/habitos — hábitos programados hoy\n' +
      '/habito <n> — marcar el hábito #n como hecho\n' +
      '/stats — resumen rápido\n\n' +
      'Cualquier otro texto se guarda como nota rápida sin triar.',
  }
}

/** Único punto de entrada — recibe el texto crudo de un mensaje y devuelve la respuesta a enviar. */
export async function handleIncomingText(text: string, today: string): Promise<CommandResult> {
  const trimmed = text.trim()

  if (trimmed === '/start' || trimmed.startsWith('/ayuda')) return replyAyuda()
  if (trimmed.startsWith('/hoy')) return replyHoy(today)
  if (trimmed.startsWith('/add ')) return replyAdd(trimmed.slice(5))
  if (trimmed.startsWith('/nota ')) return replyNota(trimmed.slice(6))
  if (/^\/hecho\s+\S+/.test(trimmed)) return replyHecho(trimmed.replace('/hecho', ''), today)
  if (trimmed.startsWith('/habitos')) return replyHabitos(today)
  if (/^\/habito\s+\S+/.test(trimmed)) return replyHabito(trimmed.replace('/habito', ''), today)
  if (trimmed.startsWith('/stats')) return replyStats(today)
  if (trimmed.startsWith('/')) return { reply: 'Comando no reconocido. Prueba /ayuda.' }

  await createQuickNote(trimmed)
  return { reply: 'Guardado en captura rápida.' }
}
