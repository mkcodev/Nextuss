import { describe, expect, it } from 'vitest'
import { applyTaskView } from './taskViewFilter'
import type { Task, TaskView } from '../../db/types'

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 't',
    status: 'planned',
    postponedCount: 0,
    createdAt: 0,
    deletedAt: 0,
    sortKey: 0,
    tagIds: [],
    xpAwarded: 0,
    ...overrides,
  }
}

function view(overrides: Partial<TaskView> = {}): TaskView {
  return {
    id: 1,
    name: 'v',
    filters: {},
    sortField: 'createdAt',
    sortDir: 'asc',
    columns: [],
    sortKey: 0,
    createdAt: 0,
    ...overrides,
  }
}

describe('applyTaskView — filters', () => {
  it('status: keeps only the listed statuses', () => {
    const tasks = [task({ id: 1, status: 'done' }), task({ id: 2, status: 'planned' })]
    const result = applyTaskView(tasks, view({ filters: { status: ['planned'] } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([2])
  })

  it('priority: only tasks with a listed priority match, undefined priority never matches', () => {
    const tasks = [task({ id: 1, priority: 1 }), task({ id: 2, priority: 3 }), task({ id: 3 })]
    const result = applyTaskView(tasks, view({ filters: { priority: [1, 2] } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([1])
  })

  it('projectId: null filters to tasks with no project', () => {
    const tasks = [task({ id: 1, projectId: 5 }), task({ id: 2 })]
    const result = applyTaskView(tasks, view({ filters: { projectId: null } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([2])
  })

  it('projectId: a number filters to that exact project', () => {
    const tasks = [task({ id: 1, projectId: 5 }), task({ id: 2, projectId: 6 }), task({ id: 3 })]
    const result = applyTaskView(tasks, view({ filters: { projectId: 5 } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([1])
  })

  it('tagIds: matches tasks sharing at least one tag', () => {
    const tasks = [task({ id: 1, tagIds: [1, 2] }), task({ id: 2, tagIds: [3] }), task({ id: 3, tagIds: [] })]
    const result = applyTaskView(tasks, view({ filters: { tagIds: [2] } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([1])
  })

  it('overdueOnly: past scheduledDate and not done', () => {
    const tasks = [
      task({ id: 1, scheduledDate: '2026-09-20', status: 'planned' }),
      task({ id: 2, scheduledDate: '2026-09-20', status: 'done' }),
      task({ id: 3, scheduledDate: '2026-09-25', status: 'planned' }),
      task({ id: 4 }),
    ]
    const result = applyTaskView(tasks, view({ filters: { overdueOnly: true } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([1])
  })

  it('dateFrom/dateTo: inclusive range on the chosen dateField', () => {
    const tasks = [
      task({ id: 1, dueDate: '2026-09-10' }),
      task({ id: 2, dueDate: '2026-09-15' }),
      task({ id: 3, dueDate: '2026-09-20' }),
      task({ id: 4 }),
    ]
    const result = applyTaskView(
      tasks,
      view({ filters: { dateField: 'dueDate', dateFrom: '2026-09-12', dateTo: '2026-09-18' } }),
      '2026-09-23',
    )
    expect(result.map((t) => t.id)).toEqual([2])
  })

  it('combines multiple filters with AND', () => {
    const tasks = [
      task({ id: 1, priority: 1, projectId: 5 }),
      task({ id: 2, priority: 1, projectId: 6 }),
      task({ id: 3, priority: 2, projectId: 5 }),
    ]
    const result = applyTaskView(tasks, view({ filters: { priority: [1], projectId: 5 } }), '2026-09-23')
    expect(result.map((t) => t.id)).toEqual([1])
  })
})

describe('applyTaskView — sort', () => {
  it('priority asc: unset priority always goes last, regardless of direction', () => {
    const tasks = [task({ id: 1, priority: 3 }), task({ id: 2 }), task({ id: 3, priority: 1 })]
    expect(applyTaskView(tasks, view({ sortField: 'priority', sortDir: 'asc' }), 't').map((t) => t.id)).toEqual([
      3, 1, 2,
    ])
    expect(applyTaskView(tasks, view({ sortField: 'priority', sortDir: 'desc' }), 't').map((t) => t.id)).toEqual([
      1, 3, 2,
    ])
  })

  it('scheduledDate: missing dates always go last', () => {
    const tasks = [task({ id: 1, scheduledDate: '2026-09-25' }), task({ id: 2 }), task({ id: 3, scheduledDate: '2026-09-20' })]
    const result = applyTaskView(tasks, view({ sortField: 'scheduledDate', sortDir: 'asc' }), 't')
    expect(result.map((t) => t.id)).toEqual([3, 1, 2])
  })

  it('title: alphabetical', () => {
    const tasks = [task({ id: 1, title: 'Zapato' }), task({ id: 2, title: 'Avión' })]
    const result = applyTaskView(tasks, view({ sortField: 'title', sortDir: 'asc' }), 't')
    expect(result.map((t) => t.id)).toEqual([2, 1])
  })
})
