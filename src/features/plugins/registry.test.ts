import { describe, expect, it } from 'vitest'
import { PLUGINS } from './registry'

describe('PLUGINS', () => {
  it('todo plugin no-núcleo tiene categoría', () => {
    for (const p of PLUGINS) {
      if (!p.core) expect(p.category, `${p.id} sin categoría`).toBeDefined()
    }
  })

  it('`requires` y `enhances` apuntan a ids que existen en el registro', () => {
    const ids = new Set(PLUGINS.map((p) => p.id))
    for (const p of PLUGINS) {
      for (const id of p.requires ?? []) expect(ids.has(id), `${p.id} requiere ${id}, que no existe`).toBe(true)
      for (const id of p.enhances ?? []) expect(ids.has(id), `${p.id} mejora ${id}, que no existe`).toBe(true)
    }
  })

  it('los plugins del núcleo no tienen `requires`', () => {
    for (const p of PLUGINS) {
      if (p.core) expect(p.requires, `${p.id} es núcleo y tiene requires`).toBeUndefined()
    }
  })

  it('no hay ids repetidos', () => {
    const ids = PLUGINS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
