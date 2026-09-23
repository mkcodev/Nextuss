import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { useUndoStore } from '../lib/undoStore'
import {
  addTagBulk,
  createTask,
  moveToProjectBulk,
  parkTasksBulk,
  setPriorityBulk,
  trashTasksBulk,
} from './repositories/tasks'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  useUndoStore.setState({ past: [], future: [] })
})

describe('setPriorityBulk', () => {
  it('applies the priority to every given task, undoable in one call', async () => {
    const a = await createTask({ title: 'a', priority: 4 })
    const b = await createTask({ title: 'b' })

    await setPriorityBulk([a, b], 1)
    expect((await db.tasks.get(a))!.priority).toBe(1)
    expect((await db.tasks.get(b))!.priority).toBe(1)

    await useUndoStore.getState().undo()
    expect((await db.tasks.get(a))!.priority).toBe(4)
    expect((await db.tasks.get(b))!.priority).toBeUndefined()
  })
})

describe('moveToProjectBulk', () => {
  it('sets projectId on every given task, undoable', async () => {
    const projectId = 42
    const a = await createTask({ title: 'a' })
    const b = await createTask({ title: 'b', projectId: 7 })

    await moveToProjectBulk([a, b], projectId)
    expect((await db.tasks.get(a))!.projectId).toBe(projectId)
    expect((await db.tasks.get(b))!.projectId).toBe(projectId)

    await useUndoStore.getState().undo()
    expect((await db.tasks.get(a))!.projectId).toBeUndefined()
    expect((await db.tasks.get(b))!.projectId).toBe(7)
  })
})

describe('addTagBulk', () => {
  it('merges the tag into each task without clobbering its existing tags', async () => {
    const a = await createTask({ title: 'a', tagIds: [1] })
    const b = await createTask({ title: 'b', tagIds: [] })

    await addTagBulk([a, b], 2)
    expect((await db.tasks.get(a))!.tagIds.sort()).toEqual([1, 2])
    expect((await db.tasks.get(b))!.tagIds).toEqual([2])
  })

  it('does not duplicate a tag a task already has', async () => {
    const a = await createTask({ title: 'a', tagIds: [2] })
    await addTagBulk([a], 2)
    expect((await db.tasks.get(a))!.tagIds).toEqual([2])
  })
})

describe('parkTasksBulk', () => {
  it('parks every given task: clears the schedule, resets postponedCount, undoable', async () => {
    const a = await createTask({ title: 'a', scheduledDate: '2026-09-20' })
    await db.tasks.update(a, { postponedCount: 3 })
    const b = await createTask({ title: 'b', scheduledDate: '2026-09-21' })

    await parkTasksBulk([a, b])
    const ta = await db.tasks.get(a)
    const tb = await db.tasks.get(b)
    expect(ta!.status).toBe('backlog')
    expect(ta!.postponedCount).toBe(0)
    expect(ta!.scheduledDate).toBeUndefined()
    expect(tb!.status).toBe('backlog')

    await useUndoStore.getState().undo()
    expect((await db.tasks.get(a))!.scheduledDate).toBe('2026-09-20')
    expect((await db.tasks.get(a))!.postponedCount).toBe(3)
  })
})

describe('trashTasksBulk', () => {
  it('trashes every given task plus each one\'s subtree, in a single trash batch', async () => {
    const parent = await createTask({ title: 'parent' })
    const child = await createTask({ title: 'child', parentId: parent })
    const standalone = await createTask({ title: 'standalone' })

    await trashTasksBulk([parent, standalone])

    expect((await db.tasks.get(parent))!.deletedAt).toBeGreaterThan(0)
    expect((await db.tasks.get(child))!.deletedAt).toBeGreaterThan(0)
    expect((await db.tasks.get(standalone))!.deletedAt).toBeGreaterThan(0)

    const entries = await db.trash.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].entityIds.sort()).toEqual([parent, child, standalone].sort())
  })

  it('is undoable in one call, restoring every trashed task', async () => {
    const a = await createTask({ title: 'a' })
    const b = await createTask({ title: 'b' })
    await trashTasksBulk([a, b])

    await useUndoStore.getState().undo()
    expect((await db.tasks.get(a))!.deletedAt).toBe(0)
    expect((await db.tasks.get(b))!.deletedAt).toBe(0)
  })
})
