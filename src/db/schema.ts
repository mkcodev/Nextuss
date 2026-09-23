import Dexie, { type EntityTable } from 'dexie'
import type {
  Achievement,
  Attribute,
  CheckIn,
  DemoSeedRecord,
  FocusSession,
  Goal,
  Habit,
  HabitLog,
  InsightFeedbackRecord,
  NotificationLogRecord,
  Progress,
  Project,
  QuickNote,
  RecurrenceRule,
  Settings,
  Tag,
  Task,
  TrashEntry,
  WeeklyReview,
} from './types'
import {
  backfillTaskTagIdsV8,
  backfillTaskXpAwardedV9,
  backfillTrashFields,
  migrateGoalV4,
  migrateHabitLogV3,
} from './migrations'

export class NextussDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  attributes!: EntityTable<Attribute, 'id'>
  progress!: EntityTable<Progress, 'id'>
  achievements!: EntityTable<Achievement, 'id'>
  tasks!: EntityTable<Task, 'id'>
  goals!: EntityTable<Goal, 'id'>
  checkins!: EntityTable<CheckIn, 'id'>
  focusSessions!: EntityTable<FocusSession, 'id'>
  reviews!: EntityTable<WeeklyReview, 'id'>
  settings!: EntityTable<Settings, 'id'>
  quickNotes!: EntityTable<QuickNote, 'id'>
  demoSeeds!: EntityTable<DemoSeedRecord, 'id'>
  notificationLog!: EntityTable<NotificationLogRecord, 'id'>
  insightFeedback!: EntityTable<InsightFeedbackRecord, 'id'>
  trash!: EntityTable<TrashEntry, 'id'>
  tags!: EntityTable<Tag, 'id'>
  projects!: EntityTable<Project, 'id'>
  recurrenceRules!: EntityTable<RecurrenceRule, 'id'>

  constructor() {
    // Nombre real de la base de datos IndexedDB — deliberadamente NO sigue el rebranding a
    // "Nextuss": cambiarlo haría que la app abra una base de datos nueva y vacía, dejando huérfanos
    // todos los datos reales ya guardados bajo 'nexus'. Es un identificador interno invisible para
    // el usuario, así que no hay ningún coste en mantenerlo estable.
    super('nexus')

    this.version(1).stores({
      habits: '++id, attributeId',
      habitLogs: '++id, habitId, date, [habitId+date]',
      attributes: '++id, order',
      progress: '++id',
      achievements: '++id, &key',
      tasks: '++id, status, scheduledDate, parentId, projectId, dueDate',
      events: '++id, date',
      goals: '++id, period, periodKey',
      checkins: '++id, &date',
      focusSessions: '++id, taskId, start',
      reviews: '++id, &weekKey',
      settings: '++id',
    })

    this.version(2).stores({
      quickNotes: '++id, createdAt',
    })

    this.version(3)
      .stores({
        habitLogs: '++id, habitId, date, loggedAt, [habitId+date]',
        achievements: '++id, &key, unlockedAt',
      })
      .upgrade(async (tx) => {
        // Backfill loggedAt for logs written before the activity feed existed.
        await tx.table('habitLogs').toCollection().modify(migrateHabitLogV3)
      })

    this.version(4)
      .stores({
        goals: '++id, period, periodKey, parentGoalId, [period+periodKey]',
      })
      .upgrade(async (tx) => {
        // Backfill fields introduced by the goals-on-steroids upgrade.
        await tx.table('goals').toCollection().modify(migrateGoalV4)
      })

    this.version(5).stores({
      tasks: '++id, status, scheduledDate, parentId, projectId, dueDate, completedAt, createdAt',
      goals: '++id, period, periodKey, parentGoalId, completedAt, [period+periodKey]',
      demoSeeds: '++id, createdAt',
      notificationLog: '++id, &key',
      insightFeedback: '++id, &key',
    })

    this.version(6)
      .stores({
        events: null, // tabla muerta desde siempre: cero lectores, cero escritores.
        tasks:
          '++id, status, scheduledDate, parentId, projectId, dueDate, completedAt, createdAt, deletedAt, sortKey, [deletedAt+status], [deletedAt+scheduledDate], [parentId+sortKey]',
        habits: '++id, attributeId, deletedAt, sortKey',
        goals:
          '++id, period, periodKey, parentGoalId, completedAt, [period+periodKey], deletedAt, sortKey, *taskIds',
        trash: '++id, deletedAt',
      })
      .upgrade(async (tx) => {
        // Papelera/deshacer (Fase 7): deletedAt=0 y sortKey denso por createdAt en las tres tablas.
        for (const name of ['tasks', 'habits', 'goals'] as const) {
          const table = tx.table(name)
          const rows = await table.toArray()
          backfillTrashFields(rows)
          await table.bulkPut(rows)
        }
      })

    this.version(8)
      .stores({
        tags: '++id, &name',
        projects: '++id, attributeId',
        tasks:
          '++id, status, scheduledDate, parentId, projectId, dueDate, completedAt, createdAt, deletedAt, sortKey, [deletedAt+status], [deletedAt+scheduledDate], [parentId+sortKey], *tagIds',
      })
      .upgrade(async (tx) => {
        // Etiquetas y proyectos reales (Fase 8.3): tagIds=[] en toda tarea existente.
        await tx.table('tasks').toCollection().modify(backfillTaskTagIdsV8)
      })

    this.version(9)
      .stores({})
      .upgrade(async (tx) => {
        // XP por tareas (Fase 8.6): xpAwarded=0 en toda tarea existente.
        await tx.table('tasks').toCollection().modify(backfillTaskXpAwardedV9)
      })

    // Tareas recurrentes (Fase 9). Sin `.upgrade()`: `recurrenceId`/`occurrenceDate` quedan
    // `undefined` en toda tarea existente, que es exactamente su significado correcto ("no
    // pertenece a ninguna serie") — a diferencia de `deletedAt`/`sortKey` en la v6, aquí no hay nada
    // que backfillear.
    this.version(10).stores({
      recurrenceRules: '++id, mode',
      tasks:
        '++id, status, scheduledDate, parentId, projectId, dueDate, completedAt, createdAt, deletedAt, sortKey, [deletedAt+status], [deletedAt+scheduledDate], [parentId+sortKey], *tagIds, recurrenceId, [recurrenceId+occurrenceDate]',
    })

    // Dashboard de proyectos (Fase 13.1): projects gana papelera + orden manual, mismo patrón que
    // tasks/habits/goals en la v6.
    this.version(11)
      .stores({
        projects: '++id, attributeId, deletedAt, sortKey',
      })
      .upgrade(async (tx) => {
        const table = tx.table('projects')
        const rows = await table.toArray()
        backfillTrashFields(rows)
        await table.bulkPut(rows)
      })
  }
}

export const db = new NextussDB()
