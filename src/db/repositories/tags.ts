import { db } from '../schema'
import type { Tag } from '../types'
import { foldText } from '../../lib/text'

export function listTags(): Promise<Tag[]> {
  return db.tags.toArray()
}

/** Busca una etiqueta existente por nombre (sin distinguir mayúsculas/acentos) o crea una nueva. */
export async function findOrCreateTag(name: string, color = '#5EC8FF'): Promise<number> {
  const clean = name.trim()
  const existing = await db.tags.filter((t) => foldText(t.name) === foldText(clean)).first()
  if (existing?.id) return existing.id
  return (await db.tags.add({ name: clean, color })) as number
}

export function updateTag(id: number, changes: Partial<Omit<Tag, 'id'>>) {
  return db.tags.update(id, changes)
}

/** Borra la etiqueta y la retira de `tagIds` en cualquier tarea que la usara — sin papelera propia,
 * igual que `deleteAttribute` (entidad pequeña, fuera del alcance de la Fase 7). */
export function deleteTag(id: number) {
  return db.transaction('rw', db.tags, db.tasks, async () => {
    const tasks = await db.tasks.where('tagIds').equals(id).toArray()
    for (const t of tasks) {
      if (t.id != null) await db.tasks.update(t.id, { tagIds: t.tagIds.filter((tagId) => tagId !== id) })
    }
    await db.tags.delete(id)
  })
}
