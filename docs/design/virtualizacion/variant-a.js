// Variante A — Minimalista/geométrico. Líneas limpias, silueta en wireframe, poco ruido visual.
// Prototipo desechable (issue #97), sin relación con el código final en React Three Fiber.
const ease = (t) => t * t * (3 - 2 * t)

export const variantA = {
  palette: { bg: '#05080b', fg: '#eaf6ff', dim: '#5c7386', accent: '#4fd1ff', line: '#1c2b36' },
  fog: '#05080b',
  fogDensity: 0.035,
  bloom: { strength: 0.7, radius: 0.5, threshold: 0.25 },
  escaneoGlitch: false,
  transmisionGlitch: false,

  init(THREE, scene) {
    const group = new THREE.Group()
    scene.add(group)

    const grid = new THREE.GridHelper(24, 32, 0x1c2b36, 0x14202a)
    grid.position.y = -2.1
    scene.add(grid)

    const geo = new THREE.IcosahedronGeometry(1.5, 1)
    const edges = new THREE.EdgesGeometry(geo)
    const silhouette = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0.35 }))
    group.add(silhouette)

    const rings = [0.9, 1.3, 1.7].map((r) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.008, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0 }),
      )
      ring.rotation.x = Math.PI / 2
      group.add(ring)
      return ring
    })

    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), new THREE.MeshBasicMaterial({ color: 0x4fd1ff, wireframe: true, transparent: true, opacity: 0 }))
    group.add(orb)
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.01, 8, 80), new THREE.MeshBasicMaterial({ color: 0x4fd1ff, transparent: true, opacity: 0 }))
    orbRing.rotation.x = Math.PI / 2.4
    group.add(orbRing)

    const count = 900
    const positions = new Float32Array(count * 3)
    const base = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 3.2 + Math.random() * 2.2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)
      positions.set([x, y, z], i * 3)
      base.set([x, y, z], i * 3)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x4fd1ff, size: 0.02, transparent: true, opacity: 0.5 }))
    group.add(particles)

    const burst = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, wireframe: true }))
    group.add(burst)

    return { group, silhouette, rings, orb, orbRing, particles, particleGeo, base, burst, convergeStart: null, breathPhase: 0 }
  },

  onVirtualize(handle) { handle.convergeStart = performance.now() },

  update(handle, { phase, dt, elapsed, t }) {
    handle.group.rotation.y += dt * 0.05

    handle.silhouette.material.opacity = phase === 'virtualizacion' ? Math.min(0.9, handle.silhouette.material.opacity + dt) : 0.3 + Math.sin(t) * 0.03
    handle.particles.material.opacity = phase === 'virtualizacion' ? 0.9 : 0.45

    handle.rings.forEach((ring, i) => {
      if (phase === 'escaneo') {
        ring.material.opacity = 0.7
        ring.position.y = ((elapsed * 0.9 + i * 0.6) % 3) - 1.5
      } else {
        ring.material.opacity = Math.max(0, ring.material.opacity - dt)
      }
    })

    const inPresence = phase === 'presencia'
    const targetOrb = inPresence ? 1 : 0
    handle.orb.material.opacity += (targetOrb - handle.orb.material.opacity) * Math.min(1, dt * 4)
    handle.orbRing.material.opacity = handle.orb.material.opacity
    if (inPresence) {
      const scale = 0.85 + ease(handle.breathPhase) * 0.3
      handle.orb.scale.setScalar(scale)
      handle.orbRing.scale.setScalar(scale * 1.05)
      handle.orbRing.rotation.z += dt * 0.3
    }

    if (handle.convergeStart != null) {
      const k = Math.min(1, (performance.now() - handle.convergeStart) / 1100)
      const pos = handle.particleGeo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const bx = handle.base[i * 3], by = handle.base[i * 3 + 1], bz = handle.base[i * 3 + 2]
        const f = ease(k)
        pos.setXYZ(i, bx * (1 - f * 0.85), by * (1 - f * 0.85), bz * (1 - f * 0.85))
      }
      pos.needsUpdate = true
      handle.burst.material.opacity = Math.max(0, 0.8 - k * 0.8)
      handle.burst.scale.setScalar(0.3 + k * 3.5)
      if (k >= 1) handle.convergeStart = null
    }
  },
}
