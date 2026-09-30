// Tema "Nítido" (A) — minimalista/geométrico. Puerto en R3F de `docs/design/virtualizacion/variant-a.js`,
// con los 2 fixes del motor compartido ya aplicados: respiración con "Sostén" fijo y anillos de escaneo
// en onda seno continua (antes eran 3 anillos de radio fijo barriendo posición en diente de sierra).
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getBreathState } from '../engine/breathCycle'
import { DEFAULT_SCAN_RINGS, getScanRadius } from '../engine/scanPulse'
import { usePhaseClock } from '../engine/usePhaseClock'
import type { ThemeProps } from './types'

const PARTICLE_COUNT = 900
const ACCENT = '#4fd1ff'

function randomShellPoint(): [number, number, number] {
  const r = 3.2 + Math.random() * 2.2
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
}

export function ThemeA({ phase, breathPattern, reducedMotion }: ThemeProps) {
  const elapsedRef = usePhaseClock(phase)
  const groupRef = useRef<THREE.Group>(null)
  const silhouetteRef = useRef<THREE.LineSegments>(null)
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const orbRef = useRef<THREE.Mesh>(null)
  const orbRingRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const burstRef = useRef<THREE.Mesh>(null)
  const convergeStartRef = useRef<number | null>(null)

  const { base, positions } = useMemo(() => {
    const base = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) base.set(randomShellPoint(), i * 3)
    return { base, positions: base.slice() }
  }, [])
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.5, 1)), [])

  useEffect(() => {
    if (phase === 'virtualizacion') convergeStartRef.current = performance.now()
  }, [phase])

  useFrame((state, dt) => {
    const elapsed = elapsedRef.current
    const t = state.clock.elapsedTime
    if (groupRef.current) groupRef.current.rotation.y += dt * (reducedMotion ? 0.015 : 0.05)

    if (silhouetteRef.current) {
      const mat = silhouetteRef.current.material as THREE.LineBasicMaterial
      mat.opacity = phase === 'virtualizacion' ? Math.min(0.9, mat.opacity + dt) : 0.3 + Math.sin(t) * 0.03
    }
    if (particlesRef.current) {
      ;(particlesRef.current.material as THREE.PointsMaterial).opacity = phase === 'virtualizacion' ? 0.9 : 0.45
    }

    ringRefs.current.forEach((ring, i) => {
      if (!ring) return
      const mat = ring.material as THREE.MeshBasicMaterial
      if (phase === 'escaneo') {
        mat.opacity = 0.7
        const radius = getScanRadius(DEFAULT_SCAN_RINGS[i], elapsed)
        ring.scale.setScalar(radius / DEFAULT_SCAN_RINGS[i].maxRadius)
      } else {
        mat.opacity = Math.max(0, mat.opacity - dt)
      }
    })

    const inPresence = phase === 'presencia'
    if (orbRef.current && orbRingRef.current) {
      const orbMat = orbRef.current.material as THREE.MeshBasicMaterial
      const ringMat = orbRingRef.current.material as THREE.MeshBasicMaterial
      orbMat.opacity += ((inPresence ? 1 : 0) - orbMat.opacity) * Math.min(1, dt * 4)
      ringMat.opacity = orbMat.opacity
      if (inPresence) {
        const breath = getBreathState(breathPattern, elapsed)
        const scale = 0.85 + breath.scale * 0.3
        orbRef.current.scale.setScalar(scale)
        orbRingRef.current.scale.setScalar(scale * 1.05)
        orbRingRef.current.rotation.z += dt * 0.3
      }
    }

    if (convergeStartRef.current != null && particlesRef.current && burstRef.current) {
      const k = Math.min(1, (performance.now() - convergeStartRef.current) / 1100)
      const f = k * k * (3 - 2 * k)
      const geo = particlesRef.current.geometry
      const pos = geo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3]
        const by = base[i * 3 + 1]
        const bz = base[i * 3 + 2]
        pos.setXYZ(i, bx * (1 - f * 0.85), by * (1 - f * 0.85), bz * (1 - f * 0.85))
      }
      pos.needsUpdate = true
      const burstMat = burstRef.current.material as THREE.MeshBasicMaterial
      burstMat.opacity = Math.max(0, 0.8 - k * 0.8)
      burstRef.current.scale.setScalar(0.3 + k * 3.5)
      if (k >= 1) convergeStartRef.current = null
    }
  })

  return (
    <group ref={groupRef}>
      <gridHelper args={[24, 32, 0x1c2b36, 0x14202a]} position={[0, -2.1, 0]} />
      <lineSegments ref={silhouetteRef} args={[edgesGeo]}>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.35} />
      </lineSegments>
      {DEFAULT_SCAN_RINGS.map((cfg, i) => (
        // Sin rotación: el toro ya encara la cámara así (mira a -Z) — tumbado de canto a la misma
        // altura Y que la cámara [0,0,6], se veía como una línea horizontal en vez de un anillo (#138).
        <mesh key={i} ref={(el) => (ringRefs.current[i] = el)}>
          <torusGeometry args={[cfg.maxRadius, 0.008, 8, 64]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0} />
        </mesh>
      ))}
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[0.42, 2]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0} />
      </mesh>
      <mesh ref={orbRingRef} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.7, 0.01, 8, 80]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={ACCENT} size={0.02} transparent opacity={0.5} />
      </points>
      <mesh ref={burstRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={0} wireframe />
      </mesh>
    </group>
  )
}
