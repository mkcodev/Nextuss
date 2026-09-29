// Mapa de constelación en SVG — puerto de `docs/design/plugins/index.html` (variante C) a componente
// real. Núcleo en el centro, plugins alrededor por categoría, fotones viajando por las líneas de los
// activos. Con `focusId`, la misma función `buildConstellation()` da la ego-red de un solo plugin: es
// el mini-mapa embebido en su ficha.
import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../../lib/cn'
import { useReducedMotion } from '../../../lib/useReducedMotion'
import { Badge, Tooltip } from '../../../design/primitives'
import { useEnabledPlugins } from '../pluginsStore'
import { PLUGINS } from '../registry'
import { PLUGIN_CATEGORIES } from '../types'
import type { PluginCategory, PluginId } from '../types'
import { buildConstellation, nodePosition } from './model'
import type { ConstellationNode } from './model'
import { useMapVisibility } from './useMapVisibility'

const FULL_BASE = { size: 480, coreR: 82, nodeR: 56, dotR: 34 }
const EGO = { size: 190, coreR: 44, nodeR: 38, dotR: 26 }

const CORE_SUB = PLUGINS.filter((p) => p.core)
  .map((p) => p.name)
  .join(' · ')

const STARFIELD_BG =
  'radial-gradient(ellipse 70% 55% at 50% 42%, var(--color-accent-soft), transparent 62%),' +
  'radial-gradient(1.6px 1.6px at 18% 24%, rgba(255,255,255,.4) 0, transparent 60%),' +
  'radial-gradient(1.6px 1.6px at 76% 16%, rgba(255,255,255,.32) 0, transparent 60%),' +
  'radial-gradient(1.4px 1.4px at 62% 78%, rgba(255,255,255,.28) 0, transparent 60%),' +
  'radial-gradient(1.4px 1.4px at 12% 70%, rgba(255,255,255,.22) 0, transparent 60%),' +
  'radial-gradient(1.4px 1.4px at 88% 60%, rgba(255,255,255,.24) 0, transparent 60%),' +
  'radial-gradient(1.2px 1.2px at 40% 88%, rgba(255,255,255,.2) 0, transparent 60%),' +
  'radial-gradient(1.2px 1.2px at 30% 8%, rgba(255,255,255,.18) 0, transparent 60%),' +
  '#0b0b0e'

export interface ConstellationMap2DProps {
  /** Presente -> ego-red de ese plugin (mini-mapa de ficha). Ausente -> mapa completo. */
  focusId?: PluginId
  enabledSet?: ReadonlySet<PluginId>
  /** Nodos a los que arrastraría el cambio en curso (parpadeo gris), pedido por quien controle el
   * interruptor — el mapa no sabe nada de `computeCascade` ni de la lista de plugins. */
  cascadeOff?: ReadonlySet<PluginId>
  selectedId?: PluginId
  onSelectNode?: (id: PluginId) => void
  /** Tamaño en px del mapa completo (el mini-mapa de ficha usa su propio tamaño fijo, más compacto). */
  size?: number
  showLegend?: boolean
  className?: string
}

export function ConstellationMap2D({
  focusId,
  enabledSet,
  cascadeOff,
  selectedId,
  onSelectNode,
  size,
  showLegend = !focusId,
  className,
}: ConstellationMap2DProps) {
  const defaultEnabled = useEnabledPlugins()
  const enabled = enabledSet ?? defaultEnabled
  const reducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const visible = useMapVisibility(containerRef)
  const [hoveredId, setHoveredId] = useState<PluginId | null>(null)

  const { nodes, edges, radii } = useMemo(() => buildConstellation({ enabledSet: enabled, focusId }), [enabled, focusId])

  const cfg = focusId ? EGO : { ...FULL_BASE, size: size ?? FULL_BASE.size }
  const scale = cfg.size / (focusId ? EGO.size : FULL_BASE.size)
  const coreR = cfg.coreR * scale
  const nodeR = cfg.nodeR * scale
  const dotR = cfg.dotR * scale
  const cx = cfg.size / 2
  const cy = cfg.size / 2
  const r1 = radii.r1
  const r2 = radii.r2 ?? radii.r1

  const neighborIds = useMemo(() => {
    if (!hoveredId) return null
    const set = new Set<PluginId>([hoveredId])
    for (const e of edges) {
      if (e.from === hoveredId && e.to) set.add(e.to)
      if (e.to === hoveredId && e.from !== 'core') set.add(e.from as PluginId)
    }
    return set
  }, [hoveredId, edges])

  const animate = !reducedMotion && visible

  const focusButton = (dir: 1 | -1) => {
    const el = containerRef.current
    if (!el) return
    const items = [...el.querySelectorAll<HTMLButtonElement>('[data-node]')]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    items[(i + dir + items.length) % items.length]?.focus()
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
    <div
      ref={containerRef}
      className="relative mx-auto overflow-hidden rounded-2xl"
      style={{ width: cfg.size, height: cfg.size, background: STARFIELD_BG }}
      role="group"
      aria-label="Mapa de dependencias de los plugins"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const id = (document.activeElement as HTMLButtonElement | null)?.dataset.node as PluginId | undefined
          if (id) onSelectNode?.(id)
          return
        }
        if (e.key === 'Escape') {
          ;(document.activeElement as HTMLElement | null)?.blur()
          setHoveredId(null)
          return
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          focusButton(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          focusButton(-1)
        }
      }}
    >
      {!focusId && (
        <motion.div
          className="pointer-events-none absolute top-1/2 left-1/2 rounded-full border border-accent/15"
          style={{ width: r1 * scale * 2 - 6, height: r1 * scale * 2 - 6, x: '-50%', y: '-50%' }}
          animate={animate ? { rotate: 360 } : undefined}
          transition={animate ? { duration: 70, repeat: Infinity, ease: 'linear' } : undefined}
        />
      )}
      <motion.div
        className="pointer-events-none absolute top-1/2 left-1/2 rounded-full border border-accent/15"
        style={{ width: r2 * scale * 2 - 6, height: r2 * scale * 2 - 6, x: '-50%', y: '-50%' }}
        animate={animate ? { rotate: -360 } : undefined}
        transition={animate ? { duration: 130, repeat: Infinity, ease: 'linear' } : undefined}
      />
      {animate && (
        <motion.div
          className="pointer-events-none absolute top-1/2 left-1/2"
          style={{
            width: r2 * scale * 2,
            height: r2 * scale * 2,
            x: '-50%',
            y: '-50%',
            mixBlendMode: 'screen',
            background: 'conic-gradient(from 0deg, var(--color-accent-soft), transparent 30deg, transparent 360deg)',
            borderRadius: '9999px',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <svg viewBox={`0 0 ${cfg.size} ${cfg.size}`} width={cfg.size} height={cfg.size} className="absolute inset-0 overflow-visible">
        {nodes.map((n) => {
          const p = nodePosition(n, radii)
          const cat = PLUGIN_CATEGORIES[n.category as PluginCategory]
          const x = cx + p.x * scale
          const y = cy + p.y * scale
          const pathId = `constellation-${focusId ?? 'full'}-${n.id}`
          return (
            <g key={n.id}>
              <path d={`M ${cx} ${cy} L ${x} ${y}`} fill="none" stroke={cat.color} strokeWidth={1.2} opacity={n.on ? 0.5 : 0.14} />
              {n.on && animate && (
                <>
                  <path id={pathId} d={`M ${cx} ${cy} L ${x} ${y}`} fill="none" stroke={cat.color} strokeWidth={1.4} strokeDasharray="3 7" opacity={0.85}>
                    <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.1s" repeatCount="indefinite" />
                  </path>
                  <circle r={2 + (n.here ? 1.6 : 1)} fill="#fff">
                    <animateMotion dur="2.2s" repeatCount="indefinite">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                  </circle>
                </>
              )}
              {n.on && !animate && <path d={`M ${cx} ${cy} L ${x} ${y}`} fill="none" stroke={cat.color} strokeWidth={1.4} opacity={0.6} />}
            </g>
          )
        })}
        {edges
          .filter((e) => e.kind === 'enhances')
          .map((e) => {
            const from = nodes.find((n) => n.id === e.from)
            const to = nodes.find((n) => n.id === e.to)
            if (!from || !to) return null
            const fp = nodePosition(from, radii)
            const tp = nodePosition(to, radii)
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={`M ${cx + fp.x * scale} ${cy + fp.y * scale} L ${cx + tp.x * scale} ${cy + tp.y * scale}`}
                fill="none"
                stroke={e.color}
                strokeWidth={1}
                strokeDasharray="2 4"
                opacity={e.on ? 0.55 : 0.15}
              />
            )
          })}
      </svg>

      {!focusId && animate && (
        <>
          <motion.div
            className="pointer-events-none absolute rounded-full border border-accent"
            style={{ width: coreR, height: coreR, left: cx, top: cy, x: '-50%', y: '-50%' }}
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="pointer-events-none absolute rounded-full border border-accent"
            style={{ width: coreR, height: coreR, left: cx, top: cy, x: '-50%', y: '-50%' }}
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 1.5 }}
          />
        </>
      )}
      <Tooltip content={focusId ? undefined : <span>{CORE_SUB}</span>}>
        <div
          className="grid place-items-center rounded-full border border-accent text-center leading-tight font-semibold text-text"
          style={{
            width: coreR,
            height: coreR,
            position: 'absolute',
            left: cx - coreR / 2,
            top: cy - coreR / 2,
            fontSize: coreR > 60 ? 11 : 8.5,
            background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.16), var(--color-accent-soft) 55%)',
            boxShadow: '0 0 0 1px var(--color-accent-soft), 0 0 34px 6px var(--color-accent-soft)',
          }}
        >
          NÚCLEO
        </div>
      </Tooltip>

      {nodes.map((n) => {
        const p = nodePosition(n, radii)
        const labelW = Math.max(nodeR, 74)
        const x = cx + p.x * scale - labelW / 2
        const y = cy + p.y * scale - nodeR / 2
        const cat = PLUGIN_CATEGORIES[n.category as PluginCategory]
        const dimmed = !!neighborIds && !neighborIds.has(n.id)
        const cascading = cascadeOff?.has(n.id)
        const NodeIcon = n.icon
        return (
          <Tooltip
            key={n.id}
            content={
              <div className="text-left">
                <b className="mb-0.5 block text-[12.5px]">{n.name}</b>
                {n.description}
                <Badge tone={n.on ? 'accent' : 'neutral'} className="mt-1.5">
                  {n.on ? 'Activo' : 'Desactivado'}
                </Badge>
              </div>
            }
          >
            <button
              type="button"
              data-node={n.id}
              className={cn(
                'absolute flex flex-col items-center text-center transition-opacity',
                dimmed && 'opacity-30',
                cascading && 'animate-pulse',
              )}
              style={{ left: x, top: y, width: labelW }}
              aria-label={`${n.name}${n.on ? ', activo' : ', desactivado'}`}
              aria-pressed={selectedId === n.id}
              onPointerEnter={() => setHoveredId(n.id)}
              onPointerLeave={() => setHoveredId((h) => (h === n.id ? null : h))}
              onFocus={() => setHoveredId(n.id)}
              onBlur={() => setHoveredId((h) => (h === n.id ? null : h))}
              onClick={() => onSelectNode?.(n.id)}
            >
              <span
                className={cn(
                  'mb-1 grid place-items-center rounded-full border-[1.5px] border-border-strong bg-bg text-text-muted',
                  (hoveredId === n.id || selectedId === n.id) && 'ring-2 ring-text',
                  n.here && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
                )}
                style={{
                  width: dotR,
                  height: dotR,
                  borderColor: n.on ? cat.color : undefined,
                  color: n.on ? cat.color : undefined,
                  backgroundColor: n.on ? `color-mix(in srgb, ${cat.color} 13%, transparent)` : undefined,
                  boxShadow: n.on ? `0 0 14px -3px ${cat.color}` : undefined,
                  opacity: n.on ? 1 : 0.38,
                }}
              >
                <NodeIcon style={{ width: dotR * 0.42, height: dotR * 0.42 }} />
              </span>
              <span className="text-xs leading-tight font-medium text-text [text-shadow:0_1px_3px_rgba(0,0,0,.8)]" style={{ opacity: n.on ? 1 : 0.38 }}>
                {n.name}
              </span>
            </button>
          </Tooltip>
        )
      })}

    </div>
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-3.5 text-[11.5px] text-text-muted">
          {Object.values(PLUGIN_CATEGORIES).map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Reexport para que quien consuma el mapa (ficha, página) no tenga que importar dos módulos.
export type { ConstellationNode }
