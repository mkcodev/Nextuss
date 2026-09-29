import { describe, expect, it } from 'vitest'
import { LayoutGrid } from 'lucide-react'
import { buildConstellation } from './model'
import { computeLayout3D, LAYOUT_3D_OPTIONS, type Layout3DId } from './layout3d'
import type { PluginId, PluginManifest } from '../types'

function plugin(id: PluginId, extra: Partial<PluginManifest> = {}): PluginManifest {
  return { id, name: id, description: '', icon: LayoutGrid, defaultEnabled: true, ...extra }
}
// Categoría 'ritual' con un único plugin: dispara el caso límite de `layoutSphere` (división por cero
// evitada en el prototipo cuando una categoría solo tiene un nodo).
const TOY: PluginManifest[] = [
  plugin('today', { core: true }),
  plugin('checkin', { category: 'ritual' }),
  plugin('routines', { category: 'hacer' }),
  plugin('dayTime', { category: 'hacer' }),
  plugin('telegram', { category: 'integraciones' }),
]

const LAYOUTS: Layout3DId[] = LAYOUT_3D_OPTIONS.map((o) => o.value)

describe('computeLayout3D', () => {
  const { nodes } = buildConstellation({ registry: TOY })

  it.each(LAYOUTS)('%s coloca a todos los nodos del grafo, sin NaN ni posiciones repetidas', (layout) => {
    const pos = computeLayout3D(layout, nodes)
    expect(pos.size).toBe(nodes.length)
    const seen = new Set<string>()
    for (const n of nodes) {
      const v = pos.get(n.id)
      expect(v).toBeDefined()
      expect(Number.isFinite(v!.x) && Number.isFinite(v!.y) && Number.isFinite(v!.z)).toBe(true)
      const key = `${v!.x.toFixed(3)},${v!.y.toFixed(3)},${v!.z.toFixed(3)}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('layoutSphere no rompe con una categoría de un solo plugin (antes: NaN por división por cero)', () => {
    const pos = computeLayout3D('sphere', nodes)
    const v = pos.get('checkin')!
    expect(Number.isFinite(v.length())).toBe(true)
    expect(v.length()).toBeGreaterThan(0)
  })

  it('el registro real también coloca a todos los nodos en las 3 disposiciones', () => {
    const { nodes: realNodes } = buildConstellation()
    for (const layout of LAYOUTS) {
      expect(computeLayout3D(layout, realNodes).size).toBe(realNodes.length)
    }
  })
})
