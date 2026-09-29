import { describe, expect, it } from 'vitest'
import { LayoutGrid } from 'lucide-react'
import { PLUGINS } from '../registry'
import { buildConstellation, computeCascade, nodePosition } from './model'
import type { PluginId, PluginManifest } from '../types'

// Registro de juguete: núcleo 'today', ritual 'a', hacer 'b' que requiere 'a', 'c' mejorado por 'a'.
function plugin(id: PluginId, extra: Partial<PluginManifest> = {}): PluginManifest {
  return { id, name: id, description: '', icon: LayoutGrid, defaultEnabled: true, ...extra }
}
const TOY: PluginManifest[] = [
  plugin('today', { core: true }),
  plugin('checkin', { category: 'ritual' }),
  plugin('routines', { category: 'hacer', requires: ['checkin'] }),
  plugin('dayTime', { category: 'hacer', enhances: ['routines'] }),
  plugin('telegram', { category: 'integraciones', defaultEnabled: false }),
]

describe('buildConstellation', () => {
  it('excluye el núcleo del grafo y reparte ritual en anillo 1, el resto en anillo 2', () => {
    const { nodes } = buildConstellation({ registry: TOY })
    expect(nodes.map((n) => n.id).sort()).toEqual(['checkin', 'dayTime', 'routines', 'telegram'])
    expect(nodes.find((n) => n.id === 'checkin')?.ring).toBe(1)
    expect(nodes.find((n) => n.id === 'routines')?.ring).toBe(2)
  })

  it('sin enabledSet usa defaultEnabled de cada plugin', () => {
    const { nodes } = buildConstellation({ registry: TOY })
    expect(nodes.find((n) => n.id === 'telegram')?.on).toBe(false)
    expect(nodes.find((n) => n.id === 'checkin')?.on).toBe(true)
  })

  it('con enabledSet manda el set sobre defaultEnabled', () => {
    const { nodes } = buildConstellation({ registry: TOY, enabledSet: new Set(['telegram']) })
    expect(nodes.find((n) => n.id === 'telegram')?.on).toBe(true)
    expect(nodes.find((n) => n.id === 'checkin')?.on).toBe(false)
  })

  it('dibuja una arista core->nodo por cada plugin y una enhances->nodo por cada `enhances`', () => {
    const { edges } = buildConstellation({ registry: TOY })
    expect(edges.filter((e) => e.kind === 'core')).toHaveLength(4)
    expect(edges.filter((e) => e.kind === 'enhances')).toEqual([
      expect.objectContaining({ from: 'dayTime', to: 'routines' }),
    ])
  })

  it('con focusId arma una ego-red de un solo anillo con el plugin y sus vecinos', () => {
    const { nodes, radii } = buildConstellation({ registry: TOY, focusId: 'routines' })
    expect(nodes.map((n) => n.id).sort()).toEqual(['checkin', 'dayTime', 'routines'])
    expect(nodes.every((n) => n.ring === 1)).toBe(true)
    expect(nodes.find((n) => n.id === 'routines')?.here).toBe(true)
    expect(radii).toEqual({ r1: 82 })
  })

  it('focusId desconocido devuelve mapa vacío', () => {
    expect(buildConstellation({ registry: TOY, focusId: 'ai' })).toEqual({ nodes: [], edges: [], radii: { r1: 82 } })
  })

  it('en el registro real todo plugin no-núcleo tiene categoría', () => {
    const { nodes } = buildConstellation()
    expect(nodes.length).toBe(PLUGINS.filter((p) => !p.core).length)
    expect(nodes.every((n) => n.category)).toBe(true)
  })
})

describe('computeCascade', () => {
  it('desactivar arrastra a los que dependen de él', () => {
    expect(computeCascade('checkin', false, TOY)).toEqual(['routines'])
  })

  it('activar arrastra sus dependencias', () => {
    expect(computeCascade('routines', true, TOY)).toEqual(['checkin'])
  })

  it('sin dependientes ni dependencias no afecta a nadie', () => {
    expect(computeCascade('telegram', false, TOY)).toEqual([])
  })
})

describe('nodePosition', () => {
  it('coloca el ángulo 0 arriba del centro (x=0, y negativo)', () => {
    const node = { id: 'checkin' as PluginId, ring: 1 as const, angle: 0 } as Parameters<typeof nodePosition>[0]
    const { x, y } = nodePosition(node, { r1: 100 })
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(-100)
  })

  it('usa r2 para el anillo 2', () => {
    const node = { id: 'dayTime' as PluginId, ring: 2 as const, angle: 90 } as Parameters<typeof nodePosition>[0]
    const { x, y } = nodePosition(node, { r1: 100, r2: 200 })
    expect(x).toBeCloseTo(200)
    expect(y).toBeCloseTo(0)
  })
})
