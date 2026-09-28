import { describe, expect, it } from 'vitest'
import { LayoutGrid } from 'lucide-react'
import { PLUGINS } from './registry'
import { planToggle, resolveEnabled } from './resolve'
import type { PluginId, PluginManifest } from './types'

// Registro de juguete con una cadena de dependencias: weeklyReview -> focus -> habits.
function plugin(id: PluginId, extra: Partial<PluginManifest> = {}): PluginManifest {
  return { id, name: id, description: '', icon: LayoutGrid, defaultEnabled: true, ...extra }
}
const TOY: PluginManifest[] = [
  plugin('today', { core: true }),
  plugin('habits'),
  plugin('focus', { requires: ['habits'] }),
  plugin('weeklyReview', { requires: ['focus'] }),
  plugin('ai', { defaultEnabled: false }),
]

describe('resolveEnabled', () => {
  it('sin nada guardado usa defaultEnabled y siempre incluye el núcleo', () => {
    expect([...resolveEnabled(undefined, TOY)].sort()).toEqual(['focus', 'habits', 'today', 'weeklyReview'])
  })

  it('lo guardado manda sobre el valor por defecto', () => {
    const enabled = resolveEnabled({ ai: true, habits: true }, TOY)
    expect(enabled.has('ai')).toBe(true)
  })

  it('el núcleo no se puede desactivar ni guardándolo', () => {
    expect(resolveEnabled({ today: false }, TOY).has('today')).toBe(true)
  })

  it('un plugin sin su dependencia queda inactivo, también en cadena', () => {
    const enabled = resolveEnabled({ habits: false }, TOY)
    expect(enabled.has('focus')).toBe(false)
    expect(enabled.has('weeklyReview')).toBe(false)
  })

  it('en el registro real todo está activo por defecto (nada cambia para el usuario actual)', () => {
    expect(resolveEnabled(undefined).size).toBe(PLUGINS.length)
  })
})

describe('planToggle', () => {
  it('desactivar arrastra a los que dependen de él', () => {
    const { next, cascaded } = planToggle('habits', false, undefined, TOY)
    expect(next).toEqual({ habits: false, focus: false, weeklyReview: false })
    expect(cascaded.sort()).toEqual(['focus', 'weeklyReview'])
  })

  it('activar arrastra sus dependencias', () => {
    const stored = { habits: false, focus: false, weeklyReview: false }
    const { next, cascaded } = planToggle('weeklyReview', true, stored, TOY)
    expect(next).toEqual({ habits: true, focus: true, weeklyReview: true })
    expect(cascaded.sort()).toEqual(['focus', 'habits'])
    expect(resolveEnabled(next, TOY).has('weeklyReview')).toBe(true)
  })

  it('no cuenta como cascada lo que ya estaba en ese estado', () => {
    const { cascaded } = planToggle('weeklyReview', true, undefined, TOY)
    expect(cascaded).toEqual([])
  })

  it('conserva los demás valores guardados', () => {
    const { next } = planToggle('ai', true, { habits: true }, TOY)
    expect(next).toEqual({ habits: true, ai: true })
  })

  it('el núcleo no cambia', () => {
    expect(planToggle('today', false, undefined, TOY)).toEqual({ next: {}, cascaded: [] })
  })
})
