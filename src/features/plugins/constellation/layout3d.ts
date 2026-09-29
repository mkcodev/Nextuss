// 3 disposiciones 3D sobre el mismo `buildConstellation()` que el mapa 2D — puerto puro (sin R3F) de
// `docs/design/plugins/mapa-3d.js#layoutOrbits/layoutSphere/layoutSpiral`. Solo deciden POSICIÓN; color,
// estado y aristas siguen viniendo del modelo compartido (`model.ts`), así que cambiar de disposición no
// reconstruye nada, solo mueve los nodos a su nuevo destino.
import { Vector3 } from 'three'
import { PLUGIN_CATEGORIES } from '../types'
import type { PluginCategory, PluginId } from '../types'
import type { ConstellationNode } from './model'

export type Layout3DId = 'orbits' | 'sphere' | 'spiral'

export const LAYOUT_3D_OPTIONS: { value: Layout3DId; label: string }[] = [
  { value: 'orbits', label: 'Órbitas' },
  { value: 'sphere', label: 'Esfera' },
  { value: 'spiral', label: 'Espiral' },
]

const CAT_KEYS = Object.keys(PLUGIN_CATEGORIES) as PluginCategory[]

function byCategory(nodes: ConstellationNode[]): Map<PluginCategory, ConstellationNode[]> {
  const map = new Map<PluginCategory, ConstellationNode[]>()
  for (const n of nodes) {
    const cat = n.category as PluginCategory
    const list = map.get(cat)
    if (list) list.push(n)
    else map.set(cat, [n])
  }
  return map
}

/** Sistema solar: cada categoría es un plano orbital con inclinación propia; radio y ritual más cerca
 * del núcleo, igual criterio que el anillo 1 del mapa 2D. */
function layoutOrbits(nodes: ConstellationNode[]): Map<PluginId, Vector3> {
  const RADIUS: Record<PluginCategory, number> = { ritual: 2.1, hacer: 3.1, motivacion: 3.6, analisis: 3.9, integraciones: 4.3 }
  const TILT: Record<PluginCategory, number> = { ritual: 0.05, hacer: 0.22, motivacion: -0.16, analisis: 0.32, integraciones: -0.28 }
  const pos = new Map<PluginId, Vector3>()
  byCategory(nodes).forEach((list, cat) => {
    const r = RADIUS[cat]
    const inc = TILT[cat]
    list.forEach((n, i) => {
      const a = (i / list.length) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const y = Math.sin(a) * r * Math.sin(inc)
      pos.set(n.id, new Vector3(x, y, z * Math.cos(inc)))
    })
  })
  return pos
}

/** Fibonacci lattice: reparto uniforme sin huecos sobre la esfera unidad. Se usa dos veces: una para los
 * `count` polos de categoría y otra (más apretada) para los nodos dentro de cada polo. */
function fibonacciDirections(count: number): Vector3[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (count <= 1 ? 0 : i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const a = golden * i
    return new Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
  })
}

/** Esfera de red agrupada: cada categoría tiene su propio "polo" (Fibonacci, para que no queden pegados
 * entre sí) y sus plugins se apiñan en un casquete alrededor de ese polo. */
function layoutSphere(nodes: ConstellationNode[]): Map<PluginId, Vector3> {
  const grouped = byCategory(nodes)
  const centers = fibonacciDirections(CAT_KEYS.length)
  const centerByCat = new Map(CAT_KEYS.map((k, i) => [k, centers[i]]))
  const R = 3.4
  const CLUSTER_SPREAD = 0.22
  const pos = new Map<PluginId, Vector3>()
  grouped.forEach((list, cat) => {
    const center = centerByCat.get(cat)!
    const up = Math.abs(center.y) < 0.98 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)
    const tangentA = new Vector3().crossVectors(up, center).normalize()
    const tangentB = new Vector3().crossVectors(center, tangentA).normalize()
    list.forEach((n, i) => {
      const a = (i / Math.max(1, list.length)) * Math.PI * 2
      // División por cero evitada: con un único plugin en la categoría, spread=0 (se queda en el polo)
      // en vez de repartir un ángulo sobre un círculo de un solo punto.
      const spread = list.length <= 1 ? 0 : CLUSTER_SPREAD
      const dir = center
        .clone()
        .addScaledVector(tangentA, Math.cos(a) * spread)
        .addScaledVector(tangentB, Math.sin(a) * spread)
        .normalize()
      pos.set(n.id, dir.multiplyScalar(R))
    })
  })
  return pos
}

/** Galaxia por brazos: un brazo espiral por categoría saliendo del núcleo. */
function layoutSpiral(nodes: ConstellationNode[]): Map<PluginId, Vector3> {
  const grouped = byCategory(nodes)
  const pos = new Map<PluginId, Vector3>()
  let catIndex = 0
  grouped.forEach((list, _cat) => {
    const armAngle = (catIndex / CAT_KEYS.length) * Math.PI * 2
    list.forEach((n, i) => {
      const t = i + 1
      const r = 1.1 + t * 0.62
      const a = armAngle + t * 0.62
      pos.set(n.id, new Vector3(Math.cos(a) * r, (i - list.length / 2) * 0.12, Math.sin(a) * r))
    })
    catIndex++
  })
  return pos
}

const LAYOUTS_3D: Record<Layout3DId, (nodes: ConstellationNode[]) => Map<PluginId, Vector3>> = {
  orbits: layoutOrbits,
  sphere: layoutSphere,
  spiral: layoutSpiral,
}

export function computeLayout3D(layout: Layout3DId, nodes: ConstellationNode[]): Map<PluginId, Vector3> {
  return LAYOUTS_3D[layout](nodes)
}
