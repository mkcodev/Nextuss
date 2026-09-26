// Generador de datos de ejemplo (~6 meses) para poder ver y verificar en el navegador los
// gráficos, insights e informes de la Fase 4 sin esperar a acumular datos reales. Determinista
// (semilla fija) y correlacionado: la "energía" del día empuja hábitos/tareas/check-ins juntos,
// para que el motor de insights tenga patrones reales que detectar.
import { addDays, subDays } from 'date-fns'
import { db } from './schema'
import type { CheckIn, EnergyLevel, FocusSession, Goal, Habit, HabitLog, Task, WeeklyReview } from './types'
import { dateKey, isHabitScheduledOn, minutesToTime, monthKey, weekKey, weekdayOf } from '../lib/dates'
import { levelForXp, XP_PER_COMPLETION, XP_PER_GOAL_MONTH, XP_PER_GOAL_WEEK } from '../lib/xp'
import { nextPeriodKey, parsePeriodKey as parsePeriodStart } from '../lib/periods'
import {
  LEVEL_ACHIEVEMENT_THRESHOLDS,
  NORTH_STAR_STREAK_ACHIEVEMENT_THRESHOLD,
  STREAK_ACHIEVEMENT_THRESHOLDS,
} from '../lib/achievementThresholds'
import { getOrCreateProgress, unlockAchievement } from './repositories/gamification'

const DEMO_RANGE_DAYS = 182 // ~6 meses, hasta ayer — hoy se deja limpio para que el usuario interactúe con él
const DEMO_SEED = 20260921
const NORTH_STAR_STREAK_WEEKS = 5 // semanas recientes forzadas a cumplir el objetivo prioritario, para que north_star_4 sea alcanzable de inmediato

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function sample<T>(pool: T[], n: number, rand: () => number): T[] {
  const copy = [...pool]
  const picked: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length)
    picked.push(copy.splice(idx, 1)[0])
  }
  return picked
}

const DEMO_ATTRIBUTES = [
  { key: 'salud', name: 'Salud', icon: 'heart', color: '#FB5A5A' },
  { key: 'mente', name: 'Mente', icon: 'brain', color: '#8B7CF6' },
  { key: 'trabajo', name: 'Trabajo', icon: 'briefcase', color: '#5058C8' },
  { key: 'relaciones', name: 'Relaciones', icon: 'sparkles', color: '#F5A524' },
] as const
type AttrKey = (typeof DEMO_ATTRIBUTES)[number]['key']

const DEMO_HABITS: Array<{
  name: string
  icon: string
  color: string
  type: Habit['type']
  targetValue?: number
  unit?: string
  weekdays: number[]
  attrKey: AttrKey
}> = [
  { name: 'Meditar', icon: 'brain', color: '#8B7CF6', type: 'binary', weekdays: [], attrKey: 'mente' },
  {
    name: 'Beber agua',
    icon: 'droplet',
    color: '#5058C8',
    type: 'quantity',
    targetValue: 8,
    unit: 'vasos',
    weekdays: [],
    attrKey: 'salud',
  },
  {
    name: 'Leer',
    icon: 'book',
    color: '#F5A524',
    type: 'duration',
    targetValue: 20,
    unit: 'min',
    weekdays: [],
    attrKey: 'mente',
  },
  { name: 'Ejercicio', icon: 'dumbbell', color: '#FB5A5A', type: 'binary', weekdays: [1, 3, 5], attrKey: 'salud' },
  {
    name: 'Sin redes por la noche',
    icon: 'smartphone',
    color: '#3ED598',
    type: 'negative',
    weekdays: [],
    attrKey: 'mente',
  },
]

const TASK_TITLES = [
  'Responder correos pendientes',
  'Preparar presentación',
  'Revisar presupuesto',
  'Llamar al banco',
  'Actualizar el CV',
  'Planificar la semana',
  'Organizar el escritorio',
  'Backup de fotos',
  'Cita con el médico',
  'Comprar regalo cumpleaños',
  'Revisar informe trimestral',
  'Estudiar para el curso',
  'Limpiar la bandeja de entrada',
  'Reunión de equipo',
  'Revisar código pendiente',
  'Pagar facturas',
  'Investigar proveedor nuevo',
  'Escribir borrador del artículo',
  'Hacer la compra semanal',
  'Renovar el DNI',
]

const GOAL_TITLES_WEEK = [
  'Entrenar 3 veces',
  'Terminar el informe',
  'Leer 100 páginas',
  'Cero pantallas después de las 22h',
  'Cerrar el sprint',
  'Llamar a la familia',
  'Meal prep del domingo',
  'Ahorrar 50€',
  'Ordenar el email',
]

const GOAL_TITLES_MONTH = [
  'Cerrar el proyecto X',
  'Correr 10km seguidos',
  'Leer 3 libros',
  'Ahorrar para las vacaciones',
  'Aprender los fundamentos de TypeScript',
  'Poner la casa en orden',
]

const REVIEW_REFLECTIONS = [
  'Semana sólida, cumplí casi todo lo que me propuse.',
  'Costó arrancar pero remonté a partir del miércoles.',
  'Demasiadas reuniones, poco tiempo para lo importante.',
  'Buena energía toda la semana, se nota en los hábitos.',
  'Semana floja, necesito reorganizar prioridades.',
  'Conseguí el objetivo principal, el resto quedó a medias.',
]

export interface DemoSeedResult {
  attributes: number
  habits: number
  habitLogs: number
  tasks: number
  checkIns: number
  focusSessions: number
  goals: number
  reviews: number
}

/** Tablas que la app usa fuera de `demoSeeds`/`notificationLog`/`insightFeedback` (esas dos últimas no llevan datos de ejemplo). */
const SEEDABLE_TABLES = [
  'attributes',
  'habits',
  'habitLogs',
  'tasks',
  'checkins',
  'focusSessions',
  'goals',
  'reviews',
  'achievements',
] as const

export async function isDemoDataPresent(): Promise<boolean> {
  return (await db.demoSeeds.count()) > 0
}

export async function generateDemoData(): Promise<DemoSeedResult> {
  if (await isDemoDataPresent()) {
    throw new Error('Ya existen datos de ejemplo. Bórralos antes de generar otros nuevos.')
  }

  const rand = mulberry32(DEMO_SEED)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const rangeStart = subDays(today, DEMO_RANGE_DAYS)

  const createdIds: Record<(typeof SEEDABLE_TABLES)[number], number[]> = {
    attributes: [],
    habits: [],
    habitLogs: [],
    tasks: [],
    checkins: [],
    focusSessions: [],
    goals: [],
    reviews: [],
    achievements: [],
  }

  try {
    // --- Atributos ---
    const attributeIdByKey = new Map<AttrKey, number>()
    for (const a of DEMO_ATTRIBUTES) {
      const order = await db.attributes.count()
      const id = (await db.attributes.add({ name: a.name, icon: a.icon, color: a.color, xp: 0, order })) as number
      attributeIdByKey.set(a.key, id)
      createdIds.attributes.push(id)
    }

    // --- Hábitos ---
    const habitIds: number[] = []
    for (const h of DEMO_HABITS) {
      const id = (await db.habits.add({
        name: h.name,
        icon: h.icon,
        color: h.color,
        type: h.type,
        targetValue: h.targetValue,
        unit: h.unit,
        weekdays: h.weekdays,
        attributeId: attributeIdByKey.get(h.attrKey),
        archived: false,
        createdAt: rangeStart.getTime(),
        deletedAt: 0,
        sortKey: habitIds.length * 1000,
      })) as number
      habitIds.push(id)
      createdIds.habits.push(id)
    }

    // --- Días del rango, con un "factor de vida" en random walk que arrastra check-ins/hábitos/tareas ---
    const dayInfos: { date: Date; key: string; lifeFactor: number; isWeekend: boolean }[] = []
    let lifeFactor = 0.6
    for (let cursor = new Date(rangeStart); cursor < today; cursor = addDays(cursor, 1)) {
      const weekday = weekdayOf(cursor)
      const isWeekend = weekday === 0 || weekday === 6
      lifeFactor = clamp(lifeFactor + (rand() - 0.5) * 0.18, 0.12, 0.95)
      const dayFactor = clamp(lifeFactor - (isWeekend ? 0.08 : 0), 0.05, 0.98)
      dayInfos.push({ date: new Date(cursor), key: dateKey(cursor), lifeFactor: dayFactor, isWeekend })
    }

    let totalXpDelta = 0
    const longestRun = new Map<number, number>()
    const runLength = new Map<number, number>()
    let anyCompletion = false

    const checkInsToAdd: CheckIn[] = []
    const habitLogsToAdd: HabitLog[] = []
    const tasksToAdd: Task[] = []

    // Tareas terminadas que aún necesitan sesiones de foco (repartidas después, cuando ya tengan id).
    const focusCandidates: { taskIndex: number; date: Date; actualMin: number }[] = []

    for (const day of dayInfos) {
      const { date, key, lifeFactor: lf, isWeekend } = day

      if (rand() < 0.85) {
        const noise = () => (rand() - 0.5) * 1.2
        checkInsToAdd.push({
          date: key,
          energy: Math.round(clamp(1 + lf * 4 + noise(), 1, 5)),
          mood: Math.round(clamp(1 + lf * 4 + noise(), 1, 5)),
          focus: Math.round(clamp(1 + lf * 4 + noise(), 1, 5)),
        })
      }

      for (let hi = 0; hi < DEMO_HABITS.length; hi++) {
        const def = DEMO_HABITS[hi]
        const habitId = habitIds[hi]
        if (!isHabitScheduledOn({ weekdays: def.weekdays } as Habit, date)) continue

        const negativeBias = def.type === 'negative' ? 0.08 : 0
        const prob = clamp(0.72 + (lf - 0.5) * 0.5 - (isWeekend ? 0.1 : 0) + negativeBias, 0.04, 0.97)
        const completed = rand() < prob

        let value: number
        if (def.type === 'binary' || def.type === 'negative') {
          value = completed ? 1 : 0
        } else {
          const target = def.targetValue ?? 1
          value = completed ? Math.round(target + rand() * target * 0.3) : Math.round(rand() * (target - 1))
        }

        const shieldUsed = !completed && rand() < 0.06
        habitLogsToAdd.push({
          habitId,
          date: key,
          value,
          completed,
          shieldUsed,
          loggedAt: date.getTime() + Math.round((8 + rand() * 14) * 3600 * 1000),
        })

        if (completed) {
          anyCompletion = true
          totalXpDelta += XP_PER_COMPLETION
          const next = (runLength.get(habitId) ?? 0) + 1
          runLength.set(habitId, next)
          longestRun.set(habitId, Math.max(longestRun.get(habitId) ?? 0, next))
        } else if (!shieldUsed) {
          runLength.set(habitId, 0)
        }
      }

      const taskCount = isWeekend ? Math.round(rand() * 2) : 1 + Math.round(rand() * 3)
      for (let i = 0; i < taskCount; i++) {
        const title = TASK_TITLES[Math.floor(rand() * TASK_TITLES.length)]
        const estimateMin = [15, 25, 30, 45, 60, 90][Math.floor(rand() * 6)]
        const energyLevel: EnergyLevel = (['low', 'medium', 'high'] as const)[Math.floor(rand() * 3)]
        const isDone = rand() < clamp(0.6 + (lf - 0.5) * 0.5, 0.1, 0.95)
        const scheduled = rand() < 0.55 || isDone

        const task: Task = {
          title,
          status: isDone ? 'done' : 'planned',
          estimateMin,
          energy: energyLevel,
          postponedCount: 0,
          createdAt: date.getTime() + Math.round(rand() * 8 * 3600 * 1000),
          deletedAt: 0,
          sortKey: tasksToAdd.length * 1000,
          tagIds: [],
          xpAwarded: 0,
        }

        if (scheduled) {
          const startMin = 8 * 60 + Math.floor(rand() * 9 * 60)
          task.scheduledDate = key
          task.scheduledStart = minutesToTime(startMin)
          task.scheduledEnd = minutesToTime(startMin + estimateMin)
        }

        if (isDone) {
          const biasFactor = 0.7 + rand() * 0.9
          task.actualMin = Math.max(5, Math.round(estimateMin * biasFactor))
          task.completedAt = date.getTime() + Math.round((9 + rand() * 10) * 3600 * 1000)
        } else if (!isWeekend && rand() < 0.12 && today.getTime() - date.getTime() > 5 * 86400000) {
          // Tarea zombie: se pospuso varias veces y sigue abierta.
          task.postponedCount = 3 + Math.floor(rand() * 4)
          task.scheduledDate = key
        } else if (rand() < 0.25) {
          task.dueDate = dateKey(addDays(date, 1 + Math.floor(rand() * 5)))
        }

        const taskIndex = tasksToAdd.length
        tasksToAdd.push(task)
        if (isDone && task.actualMin && rand() < 0.65) {
          focusCandidates.push({ taskIndex, date, actualMin: task.actualMin })
        }
      }
    }

    const habitLogIds = (await db.habitLogs.bulkAdd(habitLogsToAdd, { allKeys: true })) as number[]
    createdIds.habitLogs.push(...habitLogIds)

    const checkInIds = (await db.checkins.bulkAdd(checkInsToAdd, { allKeys: true })) as number[]
    createdIds.checkins.push(...checkInIds)

    const taskIds = (await db.tasks.bulkAdd(tasksToAdd, { allKeys: true })) as number[]
    createdIds.tasks.push(...taskIds)

    // --- Sesiones de foco: concentradas en dos franjas típicas (9-11 y 15-17), 1-2 por tarea candidata ---
    const FOCUS_HOUR_BLOCKS = [
      [9, 11],
      [15, 17],
    ] as const
    const focusSessionsToAdd: FocusSession[] = []
    for (const cand of focusCandidates) {
      const taskId = taskIds[cand.taskIndex]
      const splitInTwo = cand.actualMin > 50 && rand() < 0.5
      const chunks = splitInTwo ? [Math.round(cand.actualMin * 0.6), 0] : [cand.actualMin]
      if (splitInTwo) chunks[1] = cand.actualMin - chunks[0]

      for (const durationMin of chunks) {
        if (durationMin <= 0) continue
        const [hFrom, hTo] = FOCUS_HOUR_BLOCKS[Math.floor(rand() * FOCUS_HOUR_BLOCKS.length)]
        const startHour = hFrom + rand() * (hTo - hFrom)
        const start = new Date(cand.date).setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0)
        const end = start + durationMin * 60 * 1000
        focusSessionsToAdd.push({
          taskId,
          start,
          end,
          durationMin,
          interruptions: rand() < 0.3 ? 1 + Math.floor(rand() * 2) : 0,
        })
      }
    }
    const focusSessionIds = (await db.focusSessions.bulkAdd(focusSessionsToAdd, { allKeys: true })) as number[]
    createdIds.focusSessions.push(...focusSessionIds)

    // --- Objetivos semanales y mensuales ---
    const weekLifeFactor = new Map<string, number>()
    {
      const sums = new Map<string, { sum: number; count: number }>()
      for (const d of dayInfos) {
        const wk = weekKey(d.date)
        const e = sums.get(wk) ?? { sum: 0, count: 0 }
        e.sum += d.lifeFactor
        e.count += 1
        sums.set(wk, e)
      }
      for (const [wk, e] of sums) weekLifeFactor.set(wk, e.sum / e.count)
    }

    const currentWeekKey = weekKey(today)
    const weekKeys: string[] = []
    for (let wk = weekKey(rangeStart); wk <= currentWeekKey; wk = nextPeriodKey('week', wk)) weekKeys.push(wk)

    const weekGoalsToAdd: Goal[] = []
    // Índice paralelo: para cada objetivo semanal en weekGoalsToAdd, ¿era el prioritario ("North Star") de su semana?
    const weekGoalIsPriority: boolean[] = []
    const weekGoalPeriodKey: string[] = []

    for (let wi = 0; wi < weekKeys.length; wi++) {
      const pk = weekKeys[wi]
      const isCurrentWeek = pk === currentWeekKey
      const weeksFromEnd = weekKeys.length - 1 - wi
      const forceStreak = !isCurrentWeek && weeksFromEnd >= 1 && weeksFromEnd <= NORTH_STAR_STREAK_WEEKS
      const goalCount = 2 + Math.floor(rand() * 2)
      const titles = sample(GOAL_TITLES_WEEK, goalCount, rand)
      const priorityIndex = Math.floor(rand() * goalCount)
      const lf = weekLifeFactor.get(pk) ?? 0.5
      const baseProb = clamp(0.35 + (lf - 0.5) * 0.8, 0.1, 0.9)

      for (let gi = 0; gi < goalCount; gi++) {
        const isPriority = gi === priorityIndex
        const attrKey = DEMO_ATTRIBUTES[Math.floor(rand() * DEMO_ATTRIBUTES.length)].key
        let done: boolean
        if (isCurrentWeek) done = false
        else if (isPriority && forceStreak) done = true
        else done = rand() < (isPriority ? baseProb + 0.1 : baseProb)

        const createdAt = parsePeriodStart('week', pk).getTime()
        weekGoalsToAdd.push({
          period: 'week',
          periodKey: pk,
          title: titles[gi] ?? GOAL_TITLES_WEEK[0],
          taskIds: [],
          done,
          isPriority,
          attributeId: attributeIdByKey.get(attrKey),
          createdAt,
          completedAt: done ? createdAt + 4 * 86400000 : undefined,
          deletedAt: 0,
          sortKey: weekGoalsToAdd.length * 1000,
        })
        weekGoalIsPriority.push(isPriority)
        weekGoalPeriodKey.push(pk)

        if (done) totalXpDelta += XP_PER_GOAL_WEEK
      }
    }

    const weekGoalIds = (await db.goals.bulkAdd(weekGoalsToAdd, { allKeys: true })) as number[]
    createdIds.goals.push(...weekGoalIds)

    const currentMonthKey = monthKey(today)
    const monthKeys: string[] = []
    for (let mk = monthKey(rangeStart); mk <= currentMonthKey; mk = nextPeriodKey('month', mk)) monthKeys.push(mk)

    const monthGoalsToAdd: Goal[] = []
    for (const mk of monthKeys) {
      const isCurrentMonth = mk === currentMonthKey
      const goalCount = 1 + Math.floor(rand() * 2)
      const titles = sample(GOAL_TITLES_MONTH, goalCount, rand)
      const monthWeeks = weekGoalPeriodKey.filter((_, i) => monthKey(parsePeriodStart('week', weekGoalPeriodKey[i])) === mk)
      const monthLf = monthWeeks.length
        ? monthWeeks.reduce((sum, wk) => sum + (weekLifeFactor.get(wk) ?? 0.5), 0) / monthWeeks.length
        : 0.5

      for (let gi = 0; gi < goalCount; gi++) {
        const attrKey = DEMO_ATTRIBUTES[Math.floor(rand() * DEMO_ATTRIBUTES.length)].key
        const done = isCurrentMonth ? false : rand() < clamp(0.3 + (monthLf - 0.5) * 0.7, 0.1, 0.85)
        const createdAt = parsePeriodStart('month', mk).getTime()
        monthGoalsToAdd.push({
          period: 'month',
          periodKey: mk,
          title: titles[gi] ?? GOAL_TITLES_MONTH[0],
          taskIds: [],
          done,
          isPriority: gi === 0 && rand() < 0.4,
          attributeId: attributeIdByKey.get(attrKey),
          createdAt,
          completedAt: done ? createdAt + 20 * 86400000 : undefined,
          deletedAt: 0,
          sortKey: monthGoalsToAdd.length * 1000,
        })
        if (done) totalXpDelta += XP_PER_GOAL_MONTH
      }
    }

    const monthGoalIds = (await db.goals.bulkAdd(monthGoalsToAdd, { allKeys: true })) as number[]
    createdIds.goals.push(...monthGoalIds)

    // Enlaza ~1 objetivo semanal no-prioritario por mes a uno de los objetivos de ese mes (cascada semana→mes).
    const monthGoalIdsByMonth = new Map<string, number[]>()
    for (let i = 0; i < monthGoalsToAdd.length; i++) {
      const mk = monthGoalsToAdd[i].periodKey
      const arr = monthGoalIdsByMonth.get(mk) ?? []
      arr.push(monthGoalIds[i])
      monthGoalIdsByMonth.set(mk, arr)
    }
    for (const mk of monthKeys) {
      const monthGoalIdsForThisMonth = monthGoalIdsByMonth.get(mk) ?? []
      const candidateWeekIdx = weekGoalPeriodKey
        .map((wk, i) => ({ wk, i }))
        .filter(({ wk, i }) => monthKey(parsePeriodStart('week', wk)) === mk && !weekGoalIsPriority[i])
      if (candidateWeekIdx.length === 0 || monthGoalIdsForThisMonth.length === 0) continue
      if (rand() < 0.6) {
        const { i } = candidateWeekIdx[Math.floor(rand() * candidateWeekIdx.length)]
        const parentGoalId = monthGoalIdsForThisMonth[Math.floor(rand() * monthGoalIdsForThisMonth.length)]
        await db.goals.update(weekGoalIds[i], { parentGoalId })
      }
    }

    // --- Revisiones semanales: todas las semanas pasadas salvo la actual ---
    const reviewsToAdd: WeeklyReview[] = []
    for (let wi = 0; wi < weekKeys.length - 1; wi++) {
      const pk = weekKeys[wi]
      reviewsToAdd.push({
        weekKey: pk,
        answers: { reflection: REVIEW_REFLECTIONS[Math.floor(rand() * REVIEW_REFLECTIONS.length)] },
        createdAt: parsePeriodStart('week', nextPeriodKey('week', pk)).getTime(),
      })
    }
    const reviewIds = (await db.reviews.bulkAdd(reviewsToAdd, { allKeys: true })) as number[]
    createdIds.reviews.push(...reviewIds)

    // --- XP y nivel ---
    const progress = await getOrCreateProgress()
    const newTotalXp = Math.max(0, progress.totalXp + totalXpDelta)
    await db.progress.update(1, { totalXp: newTotalXp, level: levelForXp(newTotalXp) })

    // El xp por atributo se deriva sumando, por cada log/objetivo completado, su delta.
    const attrXpDelta = new Map<number, number>()
    const addAttrXp = (attrId: number | undefined, delta: number) => {
      if (attrId == null) return
      attrXpDelta.set(attrId, (attrXpDelta.get(attrId) ?? 0) + delta)
    }
    for (let li = 0; li < habitLogsToAdd.length; li++) {
      const log = habitLogsToAdd[li]
      if (!log.completed) continue
      const hi = habitIds.indexOf(log.habitId)
      if (hi === -1) continue
      addAttrXp(attributeIdByKey.get(DEMO_HABITS[hi].attrKey), XP_PER_COMPLETION)
    }
    for (const g of weekGoalsToAdd) if (g.done) addAttrXp(g.attributeId, XP_PER_GOAL_WEEK)
    for (const g of monthGoalsToAdd) if (g.done) addAttrXp(g.attributeId, XP_PER_GOAL_MONTH)
    for (const [attrId, delta] of attrXpDelta) {
      const attr = await db.attributes.get(attrId)
      if (attr) await db.attributes.update(attrId, { xp: Math.max(0, attr.xp + delta) })
    }

    // --- Logros ---
    const tryUnlock = async (key: string) => {
      if (await unlockAchievement(key)) {
        const entry = await db.achievements.where('key').equals(key).first()
        if (entry?.id != null) createdIds.achievements.push(entry.id)
      }
    }
    await tryUnlock('first_habit')
    if (anyCompletion) await tryUnlock('first_completion')
    const maxRun = Math.max(0, ...longestRun.values())
    for (const t of STREAK_ACHIEVEMENT_THRESHOLDS) {
      if (maxRun >= t.streak) await tryUnlock(t.key)
    }
    const finalLevel = levelForXp(newTotalXp)
    for (const t of LEVEL_ACHIEVEMENT_THRESHOLDS) {
      if (finalLevel >= t.level) await tryUnlock(t.key)
    }
    if (weekGoalsToAdd.some((g) => g.done) || monthGoalsToAdd.some((g) => g.done)) await tryUnlock('first_goal')
    if (weekGoalsToAdd.some((g) => g.done && g.isPriority)) {
      await tryUnlock('first_priority_goal')
      if (NORTH_STAR_STREAK_WEEKS >= NORTH_STAR_STREAK_ACHIEVEMENT_THRESHOLD) await tryUnlock('north_star_4')
    }

    // --- Registro para poder borrar todo limpiamente después ---
    const now = Date.now()
    for (const table of SEEDABLE_TABLES) {
      if (createdIds[table].length === 0) continue
      await db.demoSeeds.add({ table, ids: createdIds[table], createdAt: now })
    }
    if (totalXpDelta !== 0) {
      await db.demoSeeds.add({ table: 'progress', ids: [], xpDelta: totalXpDelta, createdAt: now })
    }

    return {
      attributes: createdIds.attributes.length,
      habits: createdIds.habits.length,
      habitLogs: createdIds.habitLogs.length,
      tasks: createdIds.tasks.length,
      checkIns: createdIds.checkins.length,
      focusSessions: createdIds.focusSessions.length,
      goals: createdIds.goals.length,
      reviews: createdIds.reviews.length,
    }
  } catch (err) {
    // Best-effort: limpia lo que se llegó a insertar antes del fallo.
    for (const table of SEEDABLE_TABLES) {
      if (createdIds[table].length) await db.table(table).bulkDelete(createdIds[table])
    }
    throw err
  }
}

export async function clearDemoData(): Promise<void> {
  const rows = await db.demoSeeds.toArray()
  if (rows.length === 0) return

  await db.transaction('rw', db.tables, async () => {
    let xpDelta = 0
    for (const row of rows) {
      if (row.table === 'progress') {
        xpDelta += row.xpDelta ?? 0
        continue
      }
      if (row.ids.length) await db.table(row.table).bulkDelete(row.ids)
    }
    if (xpDelta !== 0) {
      const progress = await db.progress.get(1)
      if (progress) {
        const totalXp = Math.max(0, progress.totalXp - xpDelta)
        await db.progress.update(1, { totalXp, level: levelForXp(totalXp) })
      }
    }
    await db.demoSeeds.clear()
  })
}
