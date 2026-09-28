// Variante B — Partículas orgánicas. Nube de puntos que respira y converge, escaneo con anillos
// suaves, paleta cálida. Prototipo desechable (issue #97), sin relación con el código final en R3F.
const ease = (t) => t * t * (3 - 2 * t)

function silhouetteRadius(y) {
  // Perfil aproximado de una figura de pie (cabeza, hombros, cintura, piernas), y en [-1.6, 1.6].
  if (y > 1.15) return 0.32 * (1 - (y - 1.15) / 0.45) // cabeza
  if (y > 0.75) return 0.55 // hombros
  if (y > -0.2) return 0.4 - (0.75 - y) * 0.04 // torso
  return 0.28 + Math.abs(y + 1.4) * 0.02 // piernas
}

export const variantB = {
  palette: { bg: '#0a0705', fg: '#fff1e6', dim: '#a68a72', accent: '#ffb37b', line: '#2a1f18' },
  fog: '#0a0705',
  fogDensity: 0.045,
  bloom: { strength: 1.15, radius: 0.8, threshold: 0.1 },
  escaneoGlitch: false,
  transmisionGlitch: true,

  init(THREE, scene) {
    const group = new THREE.Group()
    scene.add(group)

    const count = 2600
    const base = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const y = -1.6 + Math.random() * 3.2
      const rad = silhouetteRadius(y) * (0.6 + Math.random() * 0.4)
      const theta = Math.random() * Math.PI * 2
      base.set([Math.cos(theta) * rad, y, Math.sin(theta) * rad * 0.8], i * 3)
    }
    const positions = base.slice()
    const colors = new Float32Array(count * 3).fill(1)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const particles = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.028, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true }))
    group.add(particles)

    const scanLine = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.75, 48),
      new THREE.MeshBasicMaterial({ color: 0xffb37b, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    )
    scanLine.rotation.x = Math.PI / 2
    group.add(scanLine)

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffb37b, transparent: true, opacity: 0 }))
    group.add(orb)
    const orbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffdcb8, transparent: true, opacity: 0, wireframe: true }))
    group.add(orbGlow)

    const burst = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 20), new THREE.MeshBasicMaterial({ color: 0xfff1e6, transparent: true, opacity: 0, wireframe: true }))
    group.add(burst)

    return { group, particles, geo, base, scanLine, orb, orbGlow, burst, convergeStart: null, breathPhase: 0 }
  },

  onVirtualize(handle) { handle.convergeStart = performance.now() },

  update(handle, { phase, dt, elapsed, t }) {
    handle.group.rotation.y += dt * 0.04
    const pos = handle.geo.attributes.position
    const col = handle.geo.attributes.color
    const breathe = phase === 'presencia' ? 1 + Math.sin(elapsed * 0.15) * 0.06 : 1

    for (let i = 0; i < pos.count; i++) {
      const bx = handle.base[i * 3], by = handle.base[i * 3 + 1], bz = handle.base[i * 3 + 2]
      const wob = Math.sin(t * 1.6 + i) * 0.01
      let x = (bx + wob) * breathe, y = by, z = (bz + wob) * breathe

      if (handle.convergeStart != null) {
        const k = ease(Math.min(1, (performance.now() - handle.convergeStart) / 1200))
        x *= 1 - k * 0.9; y *= 1 - k * 0.9; z *= 1 - k * 0.9
      }
      pos.setXYZ(i, x, y, z)

      let brightness = 0.35
      if (phase === 'escaneo') {
        const dist = Math.abs(by - handle.scanY)
        brightness = Math.max(0.2, 1 - dist * 1.4)
      } else if (phase === 'virtualizacion') brightness = 0.9
      col.setXYZ(i, 1, 0.75 + brightness * 0.2, 0.5 + brightness * 0.3)
    }
    pos.needsUpdate = true
    col.needsUpdate = true

    if (phase === 'escaneo') {
      handle.scanY = (((elapsed * 0.8) % 3.4) - 1.7)
      handle.scanLine.position.y = handle.scanY
      handle.scanLine.material.opacity = 0.5
    } else handle.scanLine.material.opacity = Math.max(0, handle.scanLine.material.opacity - dt)

    const inPresence = phase === 'presencia'
    const target = inPresence ? 1 : 0
    handle.orb.material.opacity += (target - handle.orb.material.opacity) * Math.min(1, dt * 4)
    handle.orbGlow.material.opacity = handle.orb.material.opacity * 0.6
    if (inPresence) {
      const s = 0.8 + ease(handle.breathPhase) * 0.35
      handle.orb.scale.setScalar(s)
      handle.orbGlow.scale.setScalar(s * 1.15)
      handle.orbGlow.rotation.y += dt * 0.2
    }

    if (handle.convergeStart != null) {
      const k = Math.min(1, (performance.now() - handle.convergeStart) / 1200)
      handle.burst.material.opacity = Math.max(0, 0.7 - k * 0.7)
      handle.burst.scale.setScalar(0.2 + k * 4)
      if (k >= 1) handle.convergeStart = null
    }
  },
}
