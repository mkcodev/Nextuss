// Índice invertido en memoria (Fase 8.7): se construye perezosamente la primera vez que se abre la
// paleta, y a partir de ahí se mantiene al día con los hooks de Dexie — nunca se reconstruye entero
// en cada tecleo ni en cada escritura. Con años de datos son ~16k documentos: cientos de ms una vez
// por sesión, y no compensa una tabla de índice persistida (engordaría todos los backups y obligaría
// a migrar cada vez que cambie la tokenización).
import { db } from '../../db/schema'
import { foldText } from '../../lib/text'

export type SearchDocType = 'task' | 'habit' | 'goal'

export interface SearchDoc {
  id: number
  type: SearchDocType
  title: string
  subtitle?: string
}

interface IndexedDoc extends SearchDoc {
  tokens: string[]
}

function tokenize(text: string): string[] {
  return foldText(text).split(/[^a-z0-9]+/).filter(Boolean)
}

class SearchIndex {
  private docs = new Map<string, IndexedDoc>()
  private postings = new Map<string, Set<string>>()
  private built = false
  private buildPromise: Promise<void> | null = null
  private hooksRegistered = false

  private key(type: SearchDocType, id: number): string {
    return `${type}:${id}`
  }

  private removeDoc(type: SearchDocType, id: number): void {
    const k = this.key(type, id)
    const existing = this.docs.get(k)
    if (!existing) return
    for (const token of existing.tokens) this.postings.get(token)?.delete(k)
    this.docs.delete(k)
  }

  private upsertDoc(type: SearchDocType, id: number, title: string, subtitle?: string): void {
    this.removeDoc(type, id)
    const tokens = tokenize(title)
    if (tokens.length === 0) return
    const k = this.key(type, id)
    this.docs.set(k, { id, type, title, subtitle, tokens })
    for (const token of tokens) {
      let set = this.postings.get(token)
      if (!set) {
        set = new Set()
        this.postings.set(token, set)
      }
      set.add(k)
    }
  }

  /** Se llama una vez, típicamente al abrir la paleta por primera vez. Llamadas posteriores son gratis. */
  ensureBuilt(): Promise<void> {
    if (this.built) return Promise.resolve()
    if (!this.buildPromise) this.buildPromise = this.build()
    return this.buildPromise
  }

  private async build(): Promise<void> {
    const [tasks, habits, goals] = await Promise.all([db.tasks.toArray(), db.habits.toArray(), db.goals.toArray()])
    for (const t of tasks) if (t.deletedAt === 0 && t.id != null) this.upsertDoc('task', t.id, t.title)
    for (const h of habits) if (h.deletedAt === 0 && h.id != null) this.upsertDoc('habit', h.id, h.name)
    for (const g of goals) if (g.deletedAt === 0 && g.id != null) this.upsertDoc('goal', g.id, g.title, g.periodKey)
    this.registerHooks()
    this.built = true
  }

  /** Solo para tests: vuelve a un estado sin construir, sin re-registrar los hooks de Dexie (esos
   * son globales y de una sola vez para la vida del proceso, igual que en la app real). */
  resetForTests(): void {
    this.docs.clear()
    this.postings.clear()
    this.built = false
    this.buildPromise = null
  }

  private registerHooks(): void {
    if (this.hooksRegistered) return
    this.hooksRegistered = true
    db.tasks.hook('creating', function (_pk, obj) {
      this.onsuccess = (key) => {
        if (obj.deletedAt === 0) searchIndex.upsertDoc('task', key!, obj.title)
      }
    })
    db.tasks.hook('updating', function (mods, primKey, obj) {
      this.onsuccess = () => {
        const merged = { ...obj, ...mods }
        if (merged.deletedAt === 0) searchIndex.upsertDoc('task', primKey!, merged.title)
        else searchIndex.removeDoc('task', primKey!)
      }
    })
    db.tasks.hook('deleting', function (primKey) {
      this.onsuccess = () => searchIndex.removeDoc('task', primKey!)
    })

    db.habits.hook('creating', function (_pk, obj) {
      this.onsuccess = (key) => {
        if (obj.deletedAt === 0) searchIndex.upsertDoc('habit', key!, obj.name)
      }
    })
    db.habits.hook('updating', function (mods, primKey, obj) {
      this.onsuccess = () => {
        const merged = { ...obj, ...mods }
        if (merged.deletedAt === 0) searchIndex.upsertDoc('habit', primKey!, merged.name)
        else searchIndex.removeDoc('habit', primKey!)
      }
    })
    db.habits.hook('deleting', function (primKey) {
      this.onsuccess = () => searchIndex.removeDoc('habit', primKey!)
    })

    db.goals.hook('creating', function (_pk, obj) {
      this.onsuccess = (key) => {
        if (obj.deletedAt === 0) searchIndex.upsertDoc('goal', key!, obj.title, obj.periodKey)
      }
    })
    db.goals.hook('updating', function (mods, primKey, obj) {
      this.onsuccess = () => {
        const merged = { ...obj, ...mods }
        if (merged.deletedAt === 0) searchIndex.upsertDoc('goal', primKey!, merged.title, merged.periodKey)
        else searchIndex.removeDoc('goal', primKey!)
      }
    })
    db.goals.hook('deleting', function (primKey) {
      this.onsuccess = () => searchIndex.removeDoc('goal', primKey!)
    })
  }

  /** Coincidencia por prefijo de cada token de la consulta, en AND — todas las palabras deben
   * encontrar algún token del documento que empiece igual. Suficiente para "as you type" sin la
   * complejidad de un ranking real. */
  search(query: string, limit = 8): SearchDoc[] {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const matchesForToken = (qt: string): Set<string> => {
      const found = new Set<string>()
      for (const [token, docKeys] of this.postings) {
        if (token.startsWith(qt)) for (const k of docKeys) found.add(k)
      }
      return found
    }

    let matched = matchesForToken(queryTokens[0])
    for (const qt of queryTokens.slice(1)) {
      if (matched.size === 0) break
      const forThisToken = matchesForToken(qt)
      matched = new Set([...matched].filter((k) => forThisToken.has(k)))
    }

    return [...matched]
      .map((k) => this.docs.get(k))
      .filter((d): d is IndexedDoc => d != null)
      .sort((a, b) => a.title.length - b.title.length)
      .slice(0, limit)
      .map(({ id, type, title, subtitle }) => ({ id, type, title, subtitle }))
  }
}

export const searchIndex = new SearchIndex()
