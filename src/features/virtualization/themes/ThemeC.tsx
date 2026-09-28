// Tema "Terminal" (C) — silueta de cubos wireframe verde-neón. Primer corte: puerto de
// `docs/design/virtualizacion/variant-c.js` con la respiración y el barrido de escaneo ya sobre el
// motor compartido. El glitch fuerte (RGBShift/GlitchPass) se difiere a un pulido posterior; aquí el
// jitter de los cubos usa una intensidad conservadora.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ease, getBreathState } from '../engine/breathCycle'
import { oscillate } from '../engine/scanPulse'
import { usePhaseClock } from '../engine/usePhaseClock'
import type { ThemeProps } from './types'

const ACCENT = '#39ff8f'
const FG = '#d6ffe0'
const ROWS = [
  { y: 1.3, w: 2 },
  { y: 1.05, w: 3 },
  { y: 0.8, w: 3 },
  { y: 0.5, w: 4 },
  { y: 0.2, w: 4 },
  { y: -0.1, w: 3 },
  { y: -0.5, w: 3 },
  { y: -0.9, w: 3 },
  { y: -1.3, w: 3 },
]
const SCAN_Y_MIN = -1.6
const SCAN_Y_MAX = 1.6
const SCAN_PERIOD_SEC = 5.8

interface CubeBase {
  x: number
  y: number
  z: number
}

export function ThemeC({ phase, breathPattern, reducedMotion }: ThemeProps) {
  const elapsedRef = usePhaseClock(phase)
  const groupRef = useRef<THREE.Group>(null)
  const cubeRefs = useRef<(THREE.Mesh | null)[]>([])
  const scanBandRef = useRef<THREE.Mesh>(null)
  const orbRef = useRef<THREE.Mesh>(null)
  const orbRingRef = useRef<THREE.Mesh>(null)
  const burstRef = useRef<THREE.Mesh>(null)
  const convergeStartRef = useRef<number | null>(null)

  const base = useMemo<CubeBase[]>(() => {
    const out: CubeBase[] = []
    for (const { y, w } of ROWS) {
      for (let i = 0; i < w; i++) out.push({ x: (i - (w - 1) / 2) * 0.32, y, z: (Math.random() - 0.5) * 0.15 })
    }
    return out
  }, [])

  useEffect(() => {
    if (phase === 'virtualizacion') convergeStartRef.current = performance.now()
  }, [phase])

  useFrame((state, dt) => {
    const elapsed = elapsedRef.current
    const t = state.clock.elapsedTime
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(t * 0.15) * (reducedMotion ? 0.02 : 0.08)

    const jitter = !reducedMotion && (phase === 'transmision' || phase === 'escaneo')
    let convergeF = 0
    if (convergeStartRef.current != null) convergeF = ease(Math.min(1, (performance.now() - convergeStartRef.current) / 1000))

    cubeRefs.current.forEach((cube, i) => {
      if (!cube) return
      const b = base[i]
      const flick = jitter && Math.random() < 0.02 ? (Math.random() - 0.5) * 0.25 : 0
      cube.position.x = b.x + flick
      const mat = cube.material as THREE.MeshBasicMaterial
      mat.opacity = phase === 'virtualizacion' ? 0.85 : 0.4 + (jitter && Math.random() < 0.05 ? 0.4 : 0)
      if (convergeStartRef.current != null) {
        cube.position.y = convergeF > 0.6 ? b.y : b.y * (1 - convergeF)
        cube.position.z = b.z + (1 - convergeF) * (Math.random() - 0.5) * 2
      }
    })

    if (convergeStartRef.current != null && burstRef.current) {
      const burstMat = burstRef.current.material as THREE.MeshBasicMaterial
      burstMat.opacity = Math.max(0, 0.6 - convergeF * 0.6)
      burstRef.current.scale.setScalar(0.3 + convergeF * 3.2)
      burstRef.current.rotation.x += dt * 4
      if (convergeF >= 1) convergeStartRef.current = null
    }

    if (scanBandRef.current) {
      const mat = scanBandRef.current.material as THREE.MeshBasicMaterial
      if (phase === 'escaneo') {
        scanBandRef.current.position.y = oscillate(SCAN_Y_MIN, SCAN_Y_MAX, SCAN_PERIOD_SEC, 0, elapsed)
        mat.opacity = 0.7
      } else {
        mat.opacity = Math.max(0, mat.opacity - dt)
      }
    }

    const inPresence = phase === 'presencia'
    if (orbRef.current && orbRingRef.current) {
      const orbMat = orbRef.current.material as THREE.MeshBasicMaterial
      const ringMat = orbRingRef.current.material as THREE.MeshBasicMaterial
      orbMat.opacity += ((inPresence ? 1 : 0) - orbMat.opacity) * Math.min(1, dt * 4)
      ringMat.opacity = orbMat.opacity
      if (inPresence) {
        const breath = getBreathState(breathPattern, elapsed)
        const s = 0.85 + breath.scale * 0.3
        orbRef.current.scale.setScalar(s)
        orbRef.current.rotation.y += dt * 0.6
        orbRingRef.current.scale.setScalar(s * 1.05)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {base.map((b, i) => (
        <mesh key={i} ref={(el) => (cubeRefs.current[i] = el)} position={[b.x, b.y, b.z]}>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0.55} />
        </mesh>
      ))}
      <mesh ref={scanBandRef}>
        <planeGeometry args={[2.4, 0.06]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={orbRef}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color={ACCENT} wireframe transparent opacity={0} />
      </mesh>
      <mesh ref={orbRingRef} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.62, 0.012, 6, 48]} />
        <meshBasicMaterial color={FG} transparent opacity={0} />
      </mesh>
      <mesh ref={burstRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={FG} transparent opacity={0} wireframe />
      </mesh>
    </group>
  )
}
