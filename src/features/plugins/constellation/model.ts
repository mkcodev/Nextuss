// Modelo puro del mapa de constelación (#98/#135): calcula nodos y aristas a partir del registro real
// de plugins, sin ángulos ni posiciones puestas a mano. Compartido por `ConstellationMap2D` (SVG) y
// `ConstellationMap3D` (three.js) — portado desde el prototipo `docs/design/plugins/model.js`.
import { PLUGINS } from '../registry'
import { PLUGIN_CATEGORIES } from '../types'
import type { PluginId, PluginManifest } from '../types'

export interface ConstellationNode extends PluginManifest {
  ring: 1 | 2
  angle: number
  on: boolean
  /** Es el plugin enfocado (mini-mapa de una ficha), para resaltarlo distinto de sus vecinos. */
  here: boolean
}

export interface ConstellationEdge {
  from: PluginId | 'core'
  to: PluginId
  kind: 'core' | 'enhances'
  color: string
  on: boolean
}

export interface ConstellationRadii {
  r1: number
  r2?: number
}

export interface Constellation {
  nodes: ConstellationNode[]
  edges: ConstellationEdge[]
  radii: ConstellationRadii
}

/** Nodos que dependientes directos e indirectos perderían si `id` se apagara (recorre `requires` hacia
 * fuera), y los que arrastraría encender `id` (sus `requires` hacia dentro) — mismo recorrido que
 * `planToggle` en `resolve.ts`, aquí solo para previsualizar la cascada en el mapa (no escribe estado). */
export function computeCascade(
  id: PluginId,
  nextOn: boolean,
  registry: readonly PluginManifest[] = PLUGINS,
): PluginId[] {
  const byId = new Map(registry.map((p) => [p.id, p]))
  const affected = new Set<PluginId>()
  const visit = (pid: PluginId, dir: 'on' | 'off') => {
    const related =
      dir === 'off'
        ? registry.filter((p) => p.requires?.includes(pid)).map((p) => p.id) // quién depende de mí
        : (byId.get(pid)?.requires ?? []) // de quién dependo yo
    for (const r of related) {
      if (affected.has(r)) continue
      affected.add(r)
      visit(r, dir)
    }
  }
  visit(id, nextOn ? 'on' : 'off')
  return [...affected]
}

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) }
}

/** Reparte `count` nodos en un círculo sin solapes ni ángulos a mano: cada uno ocupa el centro de su
 * porción `360/count`, así que crece o encoge solo con activar/desactivar plugins del registro. */
function evenAngles(count: number, offset = 0): number[] {
  const step = 360 / count
  return Array.from({ length: count }, (_, i) => offset + i * step + step / 2)
}

export interface BuildConstellationOptions {
  /** Plugins activos; sin definir usa `defaultEnabled` de cada uno (vista de diseño, sin usuario real). */
  enabledSet?: ReadonlySet<PluginId>
  /** Presente -> ego-red de un único plugin y sus vecinos (mini-mapa de ficha). Ausente -> mapa completo. */
  focusId?: PluginId
  registry?: readonly PluginManifest[]
}

/**
 * Sin `focusId`: mapa completo con anillo 1 = categoría "ritual" (el ritual de mañana, más cerca del
 * núcleo por ser la secuencia de entrada) y anillo 2 = el resto, agrupado por categoría para que las
 * líneas de flujo no se crucen.
 * Con `focusId`: ego-red, un único anillo con el plugin y sus vecinos directos (`requires` en ambos
 * sentidos + `enhances`), repartidos a partes iguales.
 * El núcleo (`core: true`) no entra en el grafo: se resume en el hub central.
 */
export function buildConstellation({ enabledSet, focusId, registry = PLUGINS }: BuildConstellationOptions = {}): Constellation {
  const graphPlugins = registry.filter((p) => !p.core)
  const byId = new Map(graphPlugins.map((p) => [p.id, p]))
  const isOn = (id: PluginId) => (enabledSet ? enabledSet.has(id) : (byId.get(id)?.defaultEnabled ?? false))

  let placed: (PluginManifest & { ring: 1 | 2; angle: number })[]
  if (focusId) {
    const focus = byId.get(focusId)
    if (!focus) return { nodes: [], edges: [], radii: { r1: 82 } }
    const neighborIds = new Set<PluginId>([
      ...(focus.requires ?? []),
      ...(focus.enhances ?? []),
      ...graphPlugins.filter((p) => p.requires?.includes(focusId) || p.enhances?.includes(focusId)).map((p) => p.id),
    ])
    neighborIds.delete(focusId)
    const ids = [focusId, ...neighborIds].filter((id) => byId.has(id))
    const angles = evenAngles(ids.length)
    placed = ids.map((id, i) => ({ ...byId.get(id)!, ring: 1, angle: angles[i] }))
  } else {
    const ritual = graphPlugins.filter((p) => p.category === 'ritual')
    const rest = graphPlugins.filter((p) => p.category !== 'ritual')
    const a1 = evenAngles(ritual.length)
    const a2 = evenAngles(rest.length, 20)
    placed = [
      ...ritual.map((p, i) => ({ ...p, ring: 1 as const, angle: a1[i] })),
      ...rest.map((p, i) => ({ ...p, ring: 2 as const, angle: a2[i] })),
    ]
  }

  const nodes: ConstellationNode[] = placed.map((p) => ({ ...p, on: isOn(p.id), here: p.id === focusId }))
  const edges: ConstellationEdge[] = []
  for (const n of nodes) {
    edges.push({ from: 'core', to: n.id, kind: 'core', color: PLUGIN_CATEGORIES[n.category!].color, on: n.on })
  }
  const placedIds = new Set(nodes.map((n) => n.id))
  for (const p of graphPlugins) {
    for (const target of p.enhances ?? []) {
      if (placedIds.has(p.id) && placedIds.has(target)) {
        edges.push({ from: p.id, to: target, kind: 'enhances', color: PLUGIN_CATEGORIES[p.category!].color, on: isOn(p.id) && isOn(target) })
      }
    }
  }
  return { nodes, edges, radii: focusId ? { r1: 82 } : { r1: 108, r2: 196 } }
}

export function nodePosition(node: ConstellationNode, radii: ConstellationRadii): { x: number; y: number } {
  const r = node.ring === 1 ? radii.r1 : radii.r2!
  return polar(r, node.angle)
}
