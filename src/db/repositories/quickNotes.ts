import { db } from '../schema'

export async function listUntriagedNotes() {
  const all = await db.quickNotes.orderBy('createdAt').reverse().toArray()
  return all.filter((n) => !n.triaged)
}

export function createQuickNote(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return Promise.resolve(undefined)
  return db.quickNotes.add({ text: trimmed, createdAt: Date.now(), triaged: false })
}

export function deleteQuickNote(id: number) {
  return db.quickNotes.delete(id)
}

export function markNoteTriaged(id: number) {
  return db.quickNotes.update(id, { triaged: true })
}
