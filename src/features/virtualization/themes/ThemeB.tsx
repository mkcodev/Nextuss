// Tema "Orgánico" (B) — partículas cálidas con silueta humana aproximada. Primer corte: puerto de
// `docs/design/virtualizacion/variant-b.js` con la respiración y el barrido de escaneo ya sobre el
// motor compartido (mismo fix que el tema A). Pendiente de pulido posterior (ver plan de #97).
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ease, getBreathState } from '../engine/breathCycle'
import { oscillate } from '../engine/scanPulse'
import { usePhaseClock } from '../engine/usePhaseClock'
import type { ThemeProps } from './types'

const ACCENT = '#ffb37b'
const FG = '#fff1e6'
const PARTICLE_COUNT = 2600
const SCAN_Y_MIN = -1.7
const SCAN_Y_MAX = 1.7
const SCAN_PERIOD_SEC = 8.5

/** Perfil aproximado de una figura de pie (cabeza, hombros, cintura, piernas), y en [-1.6, 1.6]. */
function silhouetteRadius(y: number): number {
  if (y > 1.15) return 0.32 * (1 - (y - 1.15) / 0.45)
  if (y > 0.75) return 0.55
  if (y > -0.2) return 0.4 - (0.75 - y) * 0.04
  return 0.28 + Math.abs(y + 1.4) * 0.02
}

export function ThemeB({ phase, breathPattern, reducedMotion }: ThemeProps) {
  const elapsedRef = usePhaseClock(phase)
  const groupRef = useRef<THREE.Group>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const scanLineRef = useRef<THREE.Mesh>(null)
  const orbRef = useRef<THREE.Mesh>(null)
  const orbGlowRef = useRef<THREE.Mesh>(null)
  const burstRef = useRef<THREE.Mesh>(null)
  const convergeStartRef = useRef<number | null>(null)

  const { base, positions, colors } = useMemo(() => {
    const base = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = -1.6 + Math.random() * 3.2
      const rad = silhouetteRadius(y) * (0.6 + Math.random() * 0.4)
      const theta = Math.random() * Math.PI * 2
      base.set([Math.cos(theta) * rad, y, Math.sin(theta) * rad * 0.8], i * 3)
    }
    return { base, positions: base.slice(), colors: new Float32Array(PARTICLE_COUNT * 3).fill(1) }
  }, [])

  useEffect(() => {
    if (phase === 'virtualizacion') convergeStartRef.current = performance.now()
  }, [phase])

  useFrame((state, dt) => {
    const elapsed = elapsedRef.current
    const t = state.clock.elapsedTime
    if (groupRef.current) groupRef.current.rotation.y += dt * (reducedMotion ? 0.012 : 0.04)
    if (!particlesRef.current) return

    const geo = particlesRef.current.geometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const col = geo.attributes.color as THREE.BufferAttribute
    const breathe = phase === 'presencia' ? 1 + Math.sin(elapsed * 0.9) * 0.06 : 1
    const scanY = oscillate(SCAN_Y_MIN, SCAN_Y_MAX, SCAN_PERIOD_SEC, 0, elapsed)

    let convergeF = 0
    if (convergeStartRef.current != null) {
      convergeF = ease(Math.min(1, (performance.now() - convergeStartRef.current) / 1200))
    }

    for (let i = 0; i < pos.count; i++) {
      const bx = base[i * 3]
      const by = base[i * 3 + 1]
      const bz = base[i * 3 + 2]
      const wob = Math.sin(t * 1.6 + i) * 0.01
      let x = (bx + wob) * breathe
      let y = by
      let z = (bz + wob) * breathe
      if (convergeF > 0) {
        x *= 1 - convergeF * 0.9
        y *= 1 - convergeF * 0.9
        z *= 1 - convergeF * 0.9
      }
      pos.setXYZ(i, x, y, z)

      let brightness = 0.35
      if (phase === 'escaneo') brightness = Math.max(0.2, 1 - Math.abs(by - scanY) * 1.4)
      else if (phase === 'virtualizacion') brightness = 0.9
      col.setXYZ(i, 1, 0.75 + brightness * 0.2, 0.5 + brightness * 0.3)
    }
    pos.needsUpdate = true
    col.needsUpdate = true

    if (scanLineRef.current) {
      const mat = scanLineRef.current.material as THREE.MeshBasicMaterial
      if (phase === 'escaneo') {
        scanLineRef.current.position.y = scanY
        mat.opacity = 0.5
      } else {
        mat.opacity = Math.max(0, mat.opacity - dt)
      }
    }

    const inPresence = phase === 'presencia'
    if (orbRef.current && orbGlowRef.current) {
      const orbMat = orbRef.current.material as THREE.MeshBasicMaterial
      const glowMat = orbGlowRef.current.material as THREE.MeshBasicMaterial
      orbMat.opacity += ((inPresence ? 1 : 0) - orbMat.opacity) * Math.min(1, dt * 4)
      glowMat.opacity = orbMat.opacity * 0.6
      if (inPresence) {
        const breath = getBreathState(breathPattern, elapsed)
        const s = 0.8 + breath.scale * 0.35
        orbRef.current.scale.setScalar(s)
        orbGlowRef.current.scale.setScalar(s * 1.15)
        orbGlowRef.current.rotation.y += dt * 0.2
      }
    }

    if (convergeStartRef.current != null && burstRef.current) {
      const burstMat = burstRef.current.material as THREE.MeshBasicMaterial
      burstMat.opacity = Math.max(0, 0.7 - convergeF * 0.7)
      burstRef.current.scale.setScalar(0.2 + convergeF * 4)
      if (convergeF >= 1) convergeStartRef.current = null
    }
  })

  return (
    <group ref={groupRef}>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.028} vertexColors transparent opacity={0.85} sizeAttenuation />
      </points>
      <mesh ref={scanLineRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.02, 0.75, 48]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} />
      </mesh>
      <mesh ref={orbGlowRef}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial color={0xffdcb8} transparent opacity={0} wireframe />
      </mesh>
      <mesh ref={burstRef}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={FG} transparent opacity={0} wireframe />
      </mesh>
    </group>
  )
}
