// Mapa de constelación en R3F — puerto de `docs/design/plugins/mapa-3d.js` a componente real (#98/#135).
// Mismo modelo compartido que `ConstellationMap2D` (`buildConstellation()`): activar/desactivar un
// plugin recalcula `node.on`/`edge.on` y aquí solo se suaviza la transición de color/glow/fotón en
// `useFrame`, nada se reconstruye. Sin WebGL o con `prefers-reduced-motion` cae a `ConstellationMap2D`
// (`useCanRender3D`), así que dentro de este archivo el movimiento SIEMPRE está permitido.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, QuadraticBezierLine, type QuadraticBezierLineRef } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cn } from '../../../lib/cn'
import { useCanRender3D } from '../../../lib/useCanRender3D'
import { Badge, SegmentedControl, Tooltip } from '../../../design/primitives'
import { oscillate } from '../../virtualization/engine/scanPulse'
import { useEnabledPlugins } from '../pluginsStore'
import { PLUGIN_CATEGORIES } from '../types'
import type { PluginCategory, PluginId } from '../types'
import { buildConstellation } from './model'
import type { ConstellationEdge, ConstellationNode } from './model'
import { computeLayout3D, LAYOUT_3D_OPTIONS } from './layout3d'
import type { Layout3DId } from './layout3d'
import { useMapVisibility } from './useMapVisibility'
import { ConstellationMap2D } from './ConstellationMap2D'

const DEFAULT_SIZE = 480
const NODE_RADIUS = 0.17
const BADGE_PX = 34
const LABEL_W = 74
const CORE_POS = new THREE.Vector3(0, 0, 0)
const GRAY_COLOR = new THREE.Color('#2a2a30')
const BLACK_COLOR = new THREE.Color('#000000')
const STAR_COUNT = 700

export interface ConstellationMap3DProps {
  enabledSet?: ReadonlySet<PluginId>
  /** Nodos a los que arrastraría el cambio en curso (parpadeo), pedido por quien controle el interruptor. */
  cascadeOff?: ReadonlySet<PluginId>
  selectedId?: PluginId
  onSelectNode?: (id: PluginId) => void
  /** Tamaño en px del mapa (cuadrado, igual convención que `ConstellationMap2D`). */
  size?: number
  showLegend?: boolean
  className?: string
}

/** Punto público: cae a `ConstellationMap2D` sin WebGL o con `prefers-reduced-motion`. */
export function ConstellationMap3D(props: ConstellationMap3DProps) {
  const canRender3D = useCanRender3D()
  if (!canRender3D) return <ConstellationMap2D {...props} />
  return <ConstellationMap3DScene {...props} />
}

function ConstellationMap3DScene({
  enabledSet,
  cascadeOff,
  selectedId,
  onSelectNode,
  size = DEFAULT_SIZE,
  showLegend = true,
  className,
}: ConstellationMap3DProps) {
  const defaultEnabled = useEnabledPlugins()
  const enabled = enabledSet ?? defaultEnabled
  const containerRef = useRef<HTMLDivElement>(null)
  const visible = useMapVisibility(containerRef)
  const [hoveredId, setHoveredId] = useState<PluginId | null>(null)
  const [layout, setLayout] = useState<Layout3DId>('orbits')

  function focusButton(dir: 1 | -1) {
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
        style={{ width: size, height: size, background: '#05050a' }}
        role="group"
        aria-label="Mapa 3D de dependencias de los plugins"
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
        <Canvas camera={{ position: [0, 2.6, 11], fov: 48 }} dpr={[1, 1.5]} frameloop={visible ? 'always' : 'never'}>
          <color attach="background" args={['#05050a']} />
          <fog attach="fog" args={['#05050a', 6, 15]} />
          {/* Luz mínima solo para que los nodos apagados (gris, sin emissive) se distingan del negro del
              fondo — los encendidos brillan por su propio `emissive`, no dependen de esta luz. */}
          <ambientLight intensity={0.45} />
          <hemisphereLight args={[0x8890ff, 0x0a0a10, 0.5]} />
          <Starfield />
          <Core />
          <ConstellationGraph
            enabled={enabled}
            layout={layout}
            cascadeOff={cascadeOff}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHoverChange={setHoveredId}
            onSelectNode={onSelectNode}
          />
          <CameraRig />
          <AdaptiveBloom />
        </Canvas>
        <SegmentedControl
          options={LAYOUT_3D_OPTIONS}
          value={layout}
          onChange={setLayout}
          label="Disposición"
          size="sm"
          className="absolute top-2 right-2 border-white/15 bg-black/50 backdrop-blur-sm"
        />
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

// Mismo criterio de reparto que `randomShellPoint` de `ThemeA.tsx`, con radio min/max propios.
function randomShellPoint(rMin: number, rMax: number): [number, number, number] {
  const r = rMin + Math.random() * (rMax - rMin)
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
}

function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) arr.set(randomShellPoint(9, 22), i * 3)
    return arr
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.03} transparent opacity={0.55} sizeAttenuation />
    </points>
  )
}

// ---- Núcleo: icosaedro wireframe + anillo de sonar con la MISMA onda que el escaneo de la
// Virtualización (`engine/scanPulse.ts#oscillate`) — continuidad visual entre las dos piezas 3D de la app. ----
function Core() {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)), [])

  useFrame((state, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.06
    if (ringRef.current) {
      const r = oscillate(0.7, 1.3, 3.2, 0, state.clock.elapsedTime)
      ringRef.current.scale.setScalar(r)
      ;(ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - (r - 0.7) / 0.6)
    }
  })

  return (
    <group ref={groupRef}>
      <lineSegments args={[edgesGeo]}>
        <lineBasicMaterial color="#9aa4ff" transparent opacity={0.8} />
      </lineSegments>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.74, 64]} />
        <meshBasicMaterial color="#7c84e8" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ---- Grafo (nodos + aristas): agrupado para compartir el mapa de posiciones vivas entre ambos. ----
interface ConstellationGraphProps {
  enabled: ReadonlySet<PluginId>
  layout: Layout3DId
  cascadeOff?: ReadonlySet<PluginId>
  selectedId?: PluginId
  hoveredId: PluginId | null
  onHoverChange: (id: PluginId | null) => void
  onSelectNode?: (id: PluginId) => void
}

function ConstellationGraph({ enabled, layout, cascadeOff, selectedId, hoveredId, onHoverChange, onSelectNode }: ConstellationGraphProps) {
  const { nodes, edges } = useMemo(() => buildConstellation({ enabledSet: enabled }), [enabled])
  const targets = useMemo(() => computeLayout3D(layout, nodes), [layout, nodes])
  // Posiciones vivas de cada nodo (la MISMA instancia de `Vector3` que anima su `group`, no una copia):
  // las aristas la leen cada frame sin depender del orden de ejecución de los `useFrame` de cada nodo.
  // `useState` (sin usar nunca el setter) en vez de `useRef` porque el mapa se pasa a hijos en el árbol
  // renderizado, y leer un ref durante el render es lo que evitamos aquí.
  const [positions] = useState(() => new Map<PluginId, THREE.Vector3>())

  const neighborIds = useMemo(() => {
    if (!hoveredId) return null
    const set = new Set<PluginId>([hoveredId])
    for (const e of edges) {
      if (e.from === hoveredId && e.to) set.add(e.to)
      if (e.to === hoveredId && e.from !== 'core') set.add(e.from as PluginId)
    }
    return set
  }, [hoveredId, edges])

  return (
    <>
      {edges.map((e) => (
        <Edge3D key={`${e.from}-${e.to}`} edge={e} positions={positions} />
      ))}
      {nodes.map((n) => (
        <Node3D
          key={n.id}
          node={n}
          target={targets.get(n.id) ?? CORE_POS}
          positions={positions}
          dim={!!neighborIds && !neighborIds.has(n.id)}
          cascading={!!cascadeOff?.has(n.id)}
          selected={selectedId === n.id}
          hovered={hoveredId === n.id}
          onHoverChange={onHoverChange}
          onSelect={onSelectNode}
        />
      ))}
    </>
  )
}

interface Node3DProps {
  node: ConstellationNode
  target: THREE.Vector3
  positions: Map<PluginId, THREE.Vector3>
  dim: boolean
  cascading: boolean
  selected: boolean
  hovered: boolean
  onHoverChange: (id: PluginId | null) => void
  onSelect?: (id: PluginId) => void
}

function Node3D({ node, target, positions, dim, cascading, selected, hovered, onHoverChange, onSelect }: Node3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const cat = PLUGIN_CATEGORIES[node.category as PluginCategory]
  const catColor = useMemo(() => new THREE.Color(cat.color), [cat.color])

  useEffect(() => {
    if (groupRef.current) positions.set(node.id, groupRef.current.position)
    return () => {
      positions.delete(node.id)
    }
  }, [positions, node.id])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    // Nace en el núcleo (posición inicial [0,0,0]) y se materializa hacia su destino: mismo efecto que
    // el prototipo, gratis por cómo arranca el `group`, sin lógica de materialización aparte.
    g.position.lerp(target, Math.min(1, dt * 3))
    const wantScale = dim ? 0.75 : 1
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, wantScale, dt * 6))
    const mat = materialRef.current
    if (mat) {
      const blink = cascading ? 0.5 + 0.5 * Math.sin(performance.now() / 100) : 1
      const wantIntensity = (node.on ? 0.9 : 0) * blink
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, wantIntensity, dt * 6)
      mat.color.lerp(node.on ? catColor : GRAY_COLOR, dt * 6)
      mat.emissive.lerp(node.on ? catColor : BLACK_COLOR, dt * 6)
    }
  })

  const NodeIcon = node.icon
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[NODE_RADIUS, 24, 24]} />
        <meshStandardMaterial ref={materialRef} roughness={0.35} metalness={0.2} />
      </mesh>
      <Html center zIndexRange={[10, 0]}>
        <Tooltip
          content={
            <div className="text-left">
              <b className="mb-0.5 block text-[12.5px]">{node.name}</b>
              {node.description}
              <Badge tone={node.on ? 'accent' : 'neutral'} className="mt-1.5">
                {node.on ? 'Activo' : 'Desactivado'}
              </Badge>
            </div>
          }
        >
          <button
            type="button"
            data-node={node.id}
            className={cn('flex flex-col items-center text-center transition-opacity', dim && 'opacity-30', cascading && 'animate-pulse')}
            style={{ width: LABEL_W }}
            aria-label={`${node.name}${node.on ? ', activo' : ', desactivado'}`}
            aria-pressed={selected}
            onPointerEnter={() => onHoverChange(node.id)}
            onPointerLeave={() => onHoverChange(null)}
            onFocus={() => onHoverChange(node.id)}
            onBlur={() => onHoverChange(null)}
            onClick={() => onSelect?.(node.id)}
          >
            <span
              className={cn(
                'mb-1 grid place-items-center rounded-full border-[1.5px] border-border-strong bg-bg text-text-muted',
                (hovered || selected) && 'ring-2 ring-text',
              )}
              style={{
                width: BADGE_PX,
                height: BADGE_PX,
                borderColor: node.on ? cat.color : undefined,
                color: node.on ? cat.color : undefined,
                backgroundColor: node.on ? `color-mix(in srgb, ${cat.color} 13%, transparent)` : undefined,
                boxShadow: node.on ? `0 0 14px -3px ${cat.color}` : undefined,
                opacity: node.on ? 1 : 0.38,
              }}
            >
              <NodeIcon style={{ width: BADGE_PX * 0.42, height: BADGE_PX * 0.42 }} />
            </span>
            <span className="text-xs leading-tight font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,.8)]" style={{ opacity: node.on ? 1 : 0.38 }}>
              {node.name}
            </span>
          </button>
        </Tooltip>
      </Html>
    </group>
  )
}

interface Edge3DProps {
  edge: ConstellationEdge
  positions: Map<PluginId, THREE.Vector3>
}

/** Arista Bézier (núcleo->nodo o `enhances`) con fotón viajero. `edge.on` ya viene resuelto en vivo por
 * `buildConstellation()` a cada cambio de `enabled` — aquí solo se suaviza la transición, nunca se
 * recalcula el propio Set de activos. */
function Edge3D({ edge, positions }: Edge3DProps) {
  const lineRef = useRef<QuadraticBezierLineRef>(null)
  const photonRef = useRef<THREE.Mesh>(null)
  // Fase inicial del fotón desfasada por arista: `useState` (inicializador perezoso, se ejecuta una
  // única vez) en vez de `useRef(Math.random())`, que evaluaría `Math.random()` en cada render aunque
  // solo se use el del primero.
  const [initialT] = useState(() => Math.random())
  const tRef = useRef(initialT)
  const midRef = useRef(new THREE.Vector3())
  const speed = edge.kind === 'core' ? 0.11 : 0.16

  useFrame((_, dt) => {
    const from = edge.from === 'core' ? CORE_POS : positions.get(edge.from)
    const to = positions.get(edge.to)
    if (!from || !to) return
    const mid = midRef.current
    mid.copy(from).add(to).multiplyScalar(0.5)
    mid.y += 0.5 // pequeño "bulge" para que la curva no sea una línea recta plana
    lineRef.current?.setPoints(from, to, mid)
    const mat = lineRef.current?.material as THREE.Material | undefined
    if (mat && 'opacity' in mat) {
      const wantOpacity = edge.on ? (edge.kind === 'core' ? 0.55 : 0.4) : 0.12
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, wantOpacity, dt * 6)
    }
    if (photonRef.current) {
      photonRef.current.visible = edge.on
      tRef.current = (tRef.current + dt * speed) % 1
      const t = tRef.current
      const mt = 1 - t
      photonRef.current.position.set(
        mt * mt * from.x + 2 * mt * t * mid.x + t * t * to.x,
        mt * mt * from.y + 2 * mt * t * mid.y + t * t * to.y,
        mt * mt * from.z + 2 * mt * t * mid.z + t * t * to.z,
      )
    }
  })

  return (
    <>
      <QuadraticBezierLine
        ref={lineRef}
        start={[0, 0, 0]}
        end={[0, 0, 0]}
        lineWidth={edge.kind === 'core' ? 1.4 : 1}
        color={edge.color}
        transparent
        opacity={0.12}
      />
      <mesh ref={photonRef} visible={false}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  )
}

// ---- Cámara: órbita con auto-rotación en reposo; rueda propia (Ctrl = zoom, Shift = pan) para no
// robarle el scroll a la página cuando el mapa está embebido en un panel, no a pantalla completa. ----
function CameraRig() {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    const canvas = gl.domElement
    function cameraAxis(index: number): THREE.Vector3 {
      camera.updateMatrix()
      return new THREE.Vector3().setFromMatrixColumn(camera.matrix, index)
    }
    function onWheel(e: WheelEvent) {
      const controls = controlsRef.current
      if (!controls) return
      e.preventDefault()
      controls.autoRotate = false
      if (e.ctrlKey) {
        const offset = camera.position.clone().sub(controls.target)
        const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(e.deltaY * 0.0015), 3.5, 20)
        camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance)
      } else if (e.shiftKey) {
        const panSpeed = 0.0018 * camera.position.distanceTo(controls.target)
        const delta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * panSpeed
        const right = cameraAxis(0)
        camera.position.addScaledVector(right, delta)
        controls.target.addScaledVector(right, delta)
      }
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [camera, gl])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate
      autoRotateSpeed={0.35}
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.82}
      onStart={() => {
        if (controlsRef.current) controlsRef.current.autoRotate = false
      }}
    />
  )
}

// ---- Rendimiento: apaga el bloom si el fps medio (ventana de 60 frames) cae por debajo de 45 — barra
// de calidad comedida, este mapa no es una pantalla a pantalla completa como la Virtualización. ----
function AdaptiveBloom() {
  const [bloomOn, setBloomOn] = useState(true)
  const fpsWindow = useRef<number[]>([])

  useFrame((_, dt) => {
    const w = fpsWindow.current
    w.push(1 / Math.max(dt, 0.001))
    if (w.length > 60) w.shift()
    if (w.length === 60) {
      const avg = w.reduce((a, b) => a + b, 0) / 60
      if (avg < 45 && bloomOn) setBloomOn(false)
      else if (avg >= 55 && !bloomOn) setBloomOn(true)
    }
  })

  if (!bloomOn) return null
  return (
    <EffectComposer>
      <Bloom intensity={0.85} luminanceThreshold={0.18} radius={0.55} mipmapBlur />
    </EffectComposer>
  )
}
