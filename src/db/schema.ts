import Dexie, { type EntityTable } from 'dexie'
import type {
  Achievement,
  Attribute,
  CheckIn,
  DemoSeedRecord,
  EventItem,
  FocusSession,
  Goal,
  Habit,
  HabitLog,
  InsightFeedbackRecord,
  NotificationLogRecord,
  Progress,
  QuickNote,
  Settings,
  Task,
  WeeklyReview,
} from './types'

export class NexusDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  attributes!: EntityTable<Attribute, 'id'>
  progress!: EntityTable<Progress, 'id'>
  achievements!: EntityTable<Achievement, 'id'>
  tasks!: EntityTable<Task, 'id'>
  events!: EntityTable<EventItem, 'id'>
  goals!: EntityTable<Goal, 'id'>
  checkins!: EntityTable<CheckIn, 'id'>
  focusSessions!: EntityTable<FocusSession, 'id'>
  reviews!: EntityTable<WeeklyReview, 'id'>
  settings!: EntityTable<Settings, 'id'>
  quickNotes!: EntityTable<QuickNote, 'id'>
  demoSeeds!: EntityTable<DemoSeedRecord, 'id'>
  notificationLog!: EntityTable<NotificationLogRecord, 'id'>
  insightFeedback!: EntityTable<InsightFeedbackRecord, 'id'>

  constructor() {
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
        await tx
          .table('habitLogs')
          .toCollection()
          .modify((log) => {
            if (!log.loggedAt) log.loggedAt = Date.now()
          })
      })

    this.version(4)
      .stores({
        goals: '++id, period, periodKey, parentGoalId, [period+periodKey]',
      })
      .upgrade(async (tx) => {
        // Backfill fields introduced by the goals-on-steroids upgrade.
        await tx
          .table('goals')
          .toCollection()
          .modify((g) => {
            if (g.isPriority === undefined) g.isPriority = false
            if (!g.createdAt) g.createdAt = Date.now()
            if (!Array.isArray(g.taskIds)) g.taskIds = []
            if (g.done && !g.completedAt) g.completedAt = Date.now()
          })
      })

    this.version(5).stores({
      tasks: '++id, status, scheduledDate, parentId, projectId, dueDate, completedAt, createdAt',
      goals: '++id, period, periodKey, parentGoalId, completedAt, [period+periodKey]',
      demoSeeds: '++id, createdAt',
      notificationLog: '++id, &key',
      insightFeedback: '++id, &key',
    })
  }
}

export const db = new NexusDB()
