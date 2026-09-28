// Variante C — Terminal/glitch fuerte. Ruido digital, tipografía monoespaciada, aberración cromática
// marcada. Prototipo desechable (issue #97), sin relación con el código final en React Three Fiber.
const ease = (t) => t * t * (3 - 2 * t)

export const variantC = {
  palette: { bg: '#040606', fg: '#d6ffe0', dim: '#4f8a63', accent: '#39ff8f', line: '#123322' },
  fog: '#040606',
  fogDensity: 0.05,
  bloom: { strength: 0.85, radius: 0.4, threshold: 0.2 },
  escaneoGlitch: true,
  transmisionGlitch: true,
  transmisionGlitchPass: true,

  init(THREE, scene) {
    const group = new THREE.Group()
    scene.add(group)

    // Silueta hecha de cubos (figura "de bloques"), en vez de líneas u orgánico.
    const cubeGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14)
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0x39ff8f, wireframe: true, transparent: true, opacity: 0.55 })
    const rows = [
      { y: 1.3, w: 2 }, { y: 1.05, w: 3 }, { y: 0.8, w: 3 },
      { y: 0.5, w: 4 }, { y: 0.2, w: 4 }, { y: -0.1, w: 3 },
      { y: -0.5, w: 3 }, { y: -0.9, w: 3 }, { y: -1.3, w: 3 },
    ]
    const cubes = []
    const base = []
    rows.forEach(({ y, w }) => {
      for (let i = 0; i < w; i++) {
        const x = (i - (w - 1) / 2) * 0.32
        const c = new THREE.Mesh(cubeGeo, cubeMat.clone())
        c.position.set(x, y, (Math.random() - 0.5) * 0.15)
        group.add(c)
        cubes.push(c)
        base.push({ x, y, z: c.position.z })
      }
    })

    const scanBand = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x39ff8f, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    )
    group.add(scanBand)

    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: 0x39ff8f, wireframe: true, transparent: true, opacity: 0 }))
    group.add(orb)
    const orbRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.012, 6, 48), new THREE.MeshBasicMaterial({ color: 0xd6ffe0, transparent: true, opacity: 0 }))
    orbRing.rotation.x = Math.PI / 2.2
    group.add(orbRing)

    const burst = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xd6ffe0, transparent: true, opacity: 0, wireframe: true }))
    group.add(burst)

    return { group, cubes, base, scanBand, orb, orbRing, burst, convergeStart: null, breathPhase: 0, glitchClock: 0 }
  },

  onVirtualize(handle) { handle.convergeStart = performance.now() },

  update(handle, { phase, dt, elapsed, t }) {
    handle.group.rotation.y = Math.sin(t * 0.15) * 0.08

    handle.glitchClock += dt
    const jitter = phase === 'transmision' || phase === 'escaneo'
    handle.cubes.forEach((c, i) => {
      const b = handle.base[i]
      const flick = jitter && Math.random() < 0.02 ? (Math.random() - 0.5) * 0.25 : 0
      c.position.x = b.x + flick
      c.material.opacity = phase === 'virtualizacion' ? 0.85 : 0.4 + (jitter && Math.random() < 0.05 ? 0.4 : 0)
    })

    if (handle.convergeStart != null) {
      const k = ease(Math.min(1, (performance.now() - handle.convergeStart) / 1000))
      handle.cubes.forEach((c, i) => {
        const b = handle.base[i]
        c.position.y = b.y * (1 - k) // colapsan hacia y=0 y vuelven a montarse
        c.position.z = b.z + (1 - k) * (Math.random() - 0.5) * 2
        if (k > 0.6) c.position.y = b.y // "rearman" en su sitio al final
      })
      handle.burst.material.opacity = Math.max(0, 0.6 - k * 0.6)
      handle.burst.scale.setScalar(0.3 + k * 3.2)
      handle.burst.rotation.x += dt * 4
      if (k >= 1) handle.convergeStart = null
    }

    if (phase === 'escaneo') {
      const y = ((elapsed * 1.1) % 3.2) - 1.6
      handle.scanBand.position.y = y
      handle.scanBand.material.opacity = 0.7
    } else handle.scanBand.material.opacity = Math.max(0, handle.scanBand.material.opacity - dt)

    const inPresence = phase === 'presencia'
    const target = inPresence ? 1 : 0
    handle.orb.material.opacity += (target - handle.orb.material.opacity) * Math.min(1, dt * 4)
    handle.orbRing.material.opacity = handle.orb.material.opacity
    if (inPresence) {
      const s = 0.85 + ease(handle.breathPhase) * 0.3
      handle.orb.scale.setScalar(s)
      handle.orb.rotation.y += dt * 0.6
      handle.orbRing.scale.setScalar(s * 1.05)
    }
  },
}
