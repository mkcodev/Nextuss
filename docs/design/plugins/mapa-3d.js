// Prototipo 3D del mapa de constelación (#98) — three.js plano vía CDN, igual convención que
// docs/design/virtualizacion/shared.js: desechable, solo para decidir si la vista «Mapa» de /plugins
// merece three.js además del SVG de index.html. Usa el MISMO modelo de datos que el mapa 2D
// (`model.js#buildConstellation`), así que activar/desactivar un plugin aquí dispara la misma cascada.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { CATS, PLUGINS, buildConstellation, computeCascade } from './model.js'

// Misma onda que `src/features/virtualization/engine/scanPulse.ts#oscillate` — copiada aquí (prototipo
// plano, sin bundler) para que el anillo de sonar del núcleo lata exactamente igual que el escaneo de
// la Virtualización: continuidad visual entre las dos piezas de three.js de la app.
function oscillate(min, max, periodSec, phaseOffset, elapsedSec) {
  const wave = 0.5 + 0.5 * Math.sin((2 * Math.PI * elapsedSec) / periodSec + phaseOffset)
  return min + (max - min) * wave
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
const canRender3D = (() => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl')) && !reducedMotion
  } catch {
    return false
  }
})()
if (!canRender3D) {
  document.getElementById('canRender3DWarning').classList.add('show')
  document.getElementById('scene').style.display = 'none'
  // En la app real `useCanRender3D()` simplemente monta `ConstellationMap2D` en su lugar — aquí solo
  // avisamos, porque este archivo es el prototipo del propio 3D.
  throw new Error('Sin WebGL o con prefers-reduced-motion: el prototipo 3D no arranca (fallback real = mapa 2D).')
}

const canvas = document.getElementById('scene')
const enabled = new Set(PLUGINS.filter((p) => p.on).map((p) => p.id))

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)) // barra comedida: no es pantalla completa como la Virtualización
renderer.setSize(innerWidth, innerHeight)
renderer.setClearColor('#05050a')

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x05050a, 0.045)
// Luz mínima solo para que los nodos APAGADOS (gris, sin emisivo) se distingan del negro del fondo —
// los encendidos brillan por su propio `emissive`, no dependen de esta luz.
scene.add(new THREE.AmbientLight(0xffffff, 0.45))
scene.add(new THREE.HemisphereLight(0x8890ff, 0x0a0a10, 0.5))
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 2.6, 11) // margen extra: la disposición "integraciones" llega a radio 4.3

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableZoom = false // el zoom lo maneja nuestro propio wheel handler (ctrl+rueda), más abajo
controls.enablePan = false // el pan lo maneja nuestro propio wheel handler (shift+rueda), más abajo
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.autoRotate = true
controls.autoRotateSpeed = 0.35
controls.minPolarAngle = Math.PI * 0.18
controls.maxPolarAngle = Math.PI * 0.82
controls.target.set(0, 0, 0)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.18)
composer.addPass(bloom)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

// ---- Rueda del ratón, manejo "de editor" (Figma/Google Maps): Ctrl+rueda = zoom (acerca/aleja la
// cámara sin pasar por el zoom nativo de la página), Shift+rueda = desplazamiento lateral (pan).
// Rueda sola no hace nada (evita el zoom/scroll de la página mientras el ratón está sobre el mapa). ----
const ZOOM_MIN_DIST = 3.5
const ZOOM_MAX_DIST = 20
function cameraAxis(index) {
  camera.updateMatrix()
  return new THREE.Vector3().setFromMatrixColumn(camera.matrix, index)
}
canvas.addEventListener('wheel', (e) => {
  e.preventDefault()
  controls.autoRotate = false
  if (e.ctrlKey) {
    const offset = camera.position.clone().sub(controls.target)
    const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(e.deltaY * 0.0015), ZOOM_MIN_DIST, ZOOM_MAX_DIST)
    camera.position.copy(controls.target).addScaledVector(offset.normalize(), distance)
  } else if (e.shiftKey) {
    const panSpeed = 0.0018 * camera.position.distanceTo(controls.target)
    const delta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * panSpeed // el navegador ya suele convertir
    // Shift+rueda vertical en horizontal; si no lo hace, usamos deltaY igualmente como eje horizontal.
    const right = cameraAxis(0)
    camera.position.addScaledVector(right, delta)
    controls.target.addScaledVector(right, delta)
  }
}, { passive: false })

// ---- Campo de estrellas (mismo reparto en cáscara que `randomShellPoint` de ThemeA.tsx) ----
function randomShellPoint(rMin, rMax) {
  const r = rMin + Math.random() * (rMax - rMin)
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
}
{
  const STAR_COUNT = 700
  const positions = new Float32Array(STAR_COUNT * 3)
  for (let i = 0; i < STAR_COUNT; i++) positions.set(randomShellPoint(9, 22), i * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.55, sizeAttenuation: true })
  scene.add(new THREE.Points(geo, mat))
}

// ---- Núcleo: icosaedro wireframe (misma geometría base que la silueta de ThemeA) + anillo de sonar
// oscilando con la onda compartida del motor de la Virtualización. ----
const core = new THREE.Group()
scene.add(core)
const coreEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)),
  new THREE.LineBasicMaterial({ color: 0x9aa4ff, transparent: true, opacity: 0.8 }),
)
core.add(coreEdges)
const sonarRing = new THREE.Mesh(
  new THREE.RingGeometry(0.7, 0.74, 64),
  new THREE.MeshBasicMaterial({ color: 0x7c84e8, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
)
sonarRing.rotation.x = Math.PI / 2
core.add(sonarRing)

// ---- Layouts: 3 disposiciones sobre el mismo `buildConstellation()` (sin focusId: mapa completo).
// Cada una solo decide POSICIÓN 3D; color/estado/actividad siguen viniendo del modelo compartido. ----
const CAT_KEYS = Object.keys(CATS)

function layoutOrbits(nodes) {
  // Sistema solar: cada categoría es un plano orbital con inclinación propia; radio crece con la
  // categoría (el ritual de mañana, más cerca, como en el mapa 2D).
  const byCat = {}
  nodes.forEach((n) => (byCat[n.cat] ??= []).push(n))
  const radius = { ritual: 2.1, hacer: 3.1, motivacion: 3.6, analisis: 3.9, integraciones: 4.3 }
  const tilt = { ritual: 0.05, hacer: 0.22, motivacion: -0.16, analisis: 0.32, integraciones: -0.28 }
  const pos = new Map()
  Object.entries(byCat).forEach(([cat, list]) => {
    const r = radius[cat]
    const inc = tilt[cat]
    list.forEach((n, i) => {
      const a = (i / list.length) * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      const y = Math.sin(a) * r * Math.sin(inc)
      pos.set(n.id, new THREE.Vector3(x, y, z * Math.cos(inc)))
    })
  })
  return pos
}

// Fibonacci lattice genérico (reparto uniforme sin huecos sobre la esfera unidad) — se usa dos veces:
// una para repartir los 5 "polos" de categoría, y otra (más apretada) para los nodos DENTRO de cada
// polo, así categorías y nodos nunca se amontonan en el mismo punto.
function fibonacciDirections(count) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (count <= 1 ? 0 : i / (count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const a = golden * i
    return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)
  })
}

function layoutSphere(nodes) {
  // Esfera de red, pero agrupada: cada categoría tiene su propio "polo" (repartidos con Fibonacci para
  // que no queden pegados entre sí) y sus plugins se apiñan en un casquete alrededor de ese polo — así
  // se ve de un vistazo qué nodos son de la misma categoría, no solo por el color.
  const byCat = {}
  nodes.forEach((n) => (byCat[n.cat] ??= []).push(n))
  const centers = fibonacciDirections(CAT_KEYS.length)
  const centerByCat = Object.fromEntries(CAT_KEYS.map((k, i) => [k, centers[i]]))
  const R = 3.4
  // Radio angular del casquete: medido para que la distancia media DENTRO de una categoría quede muy
  // por debajo de la distancia media ENTRE categorías (con esto, ~4x más cerca) — es lo que hace que
  // "se vea" agrupado y no solo "un poco más cerca".
  const CLUSTER_SPREAD = 0.22
  const pos = new Map()
  Object.entries(byCat).forEach(([cat, list]) => {
    const center = centerByCat[cat]
    const up = Math.abs(center.y) < 0.98 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const tangentA = new THREE.Vector3().crossVectors(up, center).normalize()
    const tangentB = new THREE.Vector3().crossVectors(center, tangentA).normalize()
    list.forEach((n, i) => {
      const a = (i / Math.max(1, list.length)) * Math.PI * 2
      const spread = list.length <= 1 ? 0 : CLUSTER_SPREAD
      const dir = center.clone()
        .addScaledVector(tangentA, Math.cos(a) * spread)
        .addScaledVector(tangentB, Math.sin(a) * spread)
        .normalize()
      pos.set(n.id, dir.multiplyScalar(R))
    })
  })
  return pos
}

function layoutSpiral(nodes) {
  // Galaxia por brazos: un brazo espiral por categoría saliendo del núcleo.
  const byCat = {}
  nodes.forEach((n) => (byCat[n.cat] ??= []).push(n))
  const pos = new Map()
  Object.entries(byCat).forEach(([cat, list], catIndex) => {
    const armAngle = (catIndex / CAT_KEYS.length) * Math.PI * 2
    list.forEach((n, i) => {
      const t = i + 1
      const r = 1.1 + t * 0.62
      const a = armAngle + t * 0.62
      pos.set(n.id, new THREE.Vector3(Math.cos(a) * r, (i - list.length / 2) * 0.12, Math.sin(a) * r))
    })
  })
  return pos
}

const LAYOUTS = { orbits: layoutOrbits, sphere: layoutSphere, spiral: layoutSpiral }

// ---- Construcción de la escena a partir de `buildConstellation()`: nodos (esferas emisivas) + aristas
// (curvas Bezier con fotón viajero) + etiquetas DOM proyectadas (sin drei, así que a mano). ----
const state = { layout: 'orbits', nodes: [], edges: [], meshes: new Map(), curves: [], photons: [], targetPositions: new Map() }
const nodesGroup = new THREE.Group()
const edgesGroup = new THREE.Group()
scene.add(nodesGroup, edgesGroup)

const labelLayer = document.createElement('div')
labelLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:5'
document.body.appendChild(labelLayer)

const GRAY_COLOR = new THREE.Color(0x2a2a30)
const BLACK_COLOR = new THREE.Color(0x000000)

function sphereMaterial(color, on) {
  return new THREE.MeshStandardMaterial({
    color: on ? color : GRAY_COLOR,
    emissive: on ? color : BLACK_COLOR,
    emissiveIntensity: on ? 0.9 : 0,
    roughness: 0.35,
    metalness: 0.2,
  })
}

// `rebuildScene()` solo se llama UNA VEZ, al cargar la página (o al recomponer si cambiara el propio
// registro de plugins). Encender/apagar un plugin NO pasa por aquí — solo cambia el Set `enabled`, y
// `tick()` lee ese estado en vivo cada frame para el color/glow/fotón de cada nodo y arista, así que
// nada se reconstruye ni se reposiciona (antes sí, y por eso "volvían a salir desde el centro" en cada
// toggle: cada plugin recreaba SU mesh desde cero con la animación de materialización).
function rebuildScene() {
  const { nodes, edges } = buildConstellation({ enabledSet: enabled })
  state.nodes = nodes
  state.edges = edges
  const positions = LAYOUTS[state.layout](nodes)
  state.targetPositions = positions

  nodesGroup.children.forEach((m) => { m.geometry.dispose(); m.material.dispose() })
  edgesGroup.children.forEach((m) => { m.geometry.dispose(); m.material.dispose() })
  nodesGroup.clear()
  edgesGroup.clear()
  labelLayer.innerHTML = ''
  state.meshes.clear()
  state.curves = []
  state.photons = []

  nodes.forEach((n) => {
    const cat = CATS[n.cat]
    const color = new THREE.Color(cat.color)
    const size = 0.16 + n.activity * 0.07
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 24), sphereMaterial(color, n.on))
    const target = positions.get(n.id) ?? new THREE.Vector3()
    mesh.position.copy(target).multiplyScalar(reducedMotion ? 1 : 0.001) // materialización: nace en el núcleo
    mesh.userData = { id: n.id, target, size, catColor: color, catColorHex: cat.color }
    nodesGroup.add(mesh)
    state.meshes.set(n.id, mesh)

    const label = document.createElement('div')
    label.textContent = n.label
    // Chip con fondo, no solo texto con sombra: contra el bloom y el campo de estrellas, el texto solo
    // con text-shadow se leía mal (aviso del usuario) — el fondo semitransparente da contraste fijo.
    label.style.cssText = 'position:absolute;transform:translate(-50%,10px);font:600 12.5px ui-sans-serif,system-ui,sans-serif;color:#f2f2f6;background:rgba(10,10,14,.62);border:1px solid rgba(255,255,255,.08);padding:2px 8px;border-radius:6px;white-space:nowrap;letter-spacing:.01em;'
    labelLayer.appendChild(label)
    mesh.userData.label = label

    // Icono representativo dentro de la bolita: insignia circular de fondo oscuro + icono lucide, MISMO
    // tratamiento que `.dot` en el mapa 2D (`index.html`) — un icono suelto encima de una esfera con
    // bloom se perdía por falta de contraste (aviso del usuario), el fondo sólido lo arregla siempre,
    // brille lo que brille detrás. El tamaño se ajusta cada frame en `tick()` a como se vea la esfera en
    // pantalla (más grande de cerca, más pequeño de lejos), no es un tamaño fijo.
    const iconEl = document.createElement('div')
    iconEl.innerHTML = `<i data-lucide="${n.icon}"></i>`
    iconEl.style.cssText = 'position:absolute;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;pointer-events:none;box-sizing:border-box;'
    labelLayer.appendChild(iconEl)
    mesh.userData.iconEl = iconEl
  })
  lucide.createIcons({ nameAttr: 'data-lucide' })

  edges.forEach((e) => {
    const from = e.from === 'core' ? new THREE.Vector3(0, 0, 0) : positions.get(e.from)
    const to = positions.get(e.to)
    if (!from || !to) return
    const mid = from.clone().add(to).multiplyScalar(0.5)
    mid.y += 0.5 // pequeño "bulge" para que la curva no sea una línea recta plana
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
    const color = new THREE.Color(e.color)
    const opacity = e.on ? (e.kind === 'core' ? 0.55 : 0.4) : 0.12
    const geo = new THREE.TubeGeometry(curve, 24, e.kind === 'core' ? 0.008 : 0.005, 6, false)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
    const tube = new THREE.Mesh(geo, mat)
    tube.userData = { edge: e }
    edgesGroup.add(tube)
    if (!reducedMotion) {
      // El fotón se crea para TODAS las aristas (no solo las que empiezan encendidas): así, si más
      // tarde se enciende el plugin, su fotón ya existe y solo hay que hacerlo visible en `tick()`, sin
      // reconstruir nada.
      const photon = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }))
      photon.userData = { curve, edge: e, speed: 0.22 - Math.min(0.16, (nodeById(e.to)?.activity ?? 0.3) * 0.16), t: Math.random() }
      photon.visible = e.on
      edgesGroup.add(photon)
      state.photons.push(photon)
    }
    state.curves.push({ tube, edge: e })
  })
}

function nodeById(id) {
  return state.nodes.find((n) => n.id === id)
}

// ---- Legend + interruptores (idea 2 traída al 3D: hover previsualiza la cascada con la MISMA regla
// que el mapa 2D y que `planToggle` en el código real) ----
document.getElementById('legend').innerHTML = Object.values(CATS)
  .map((c) => `<span class="lg"><span class="sw" style="background:${c.color}"></span>${c.label}</span>`)
  .join('')

const switchesEl = document.getElementById('switches')
switchesEl.innerHTML = PLUGINS.map((p) => `
  <div class="row" data-plugin="${p.id}">
    <span class="n">${p.label}</span>
    <span class="switch ${p.on ? 'on' : ''}" data-switch="${p.id}" role="switch" aria-checked="${p.on}" tabindex="0"></span>
  </div>`).join('')

function previewCascade(id, on) {
  const cascade = on ? computeCascade(id, !enabled.has(id)) : []
  state.meshes.forEach((mesh, nid) => {
    const dim = on && cascade.includes(nid)
    mesh.userData.blinking = dim
  })
}
switchesEl.querySelectorAll('[data-switch]').forEach((sw) => {
  const id = sw.dataset.switch
  sw.addEventListener('mouseenter', () => previewCascade(id, true))
  sw.addEventListener('mouseleave', () => previewCascade(id, false))
  const toggle = () => {
    const nextOn = !enabled.has(id)
    const cascade = computeCascade(id, nextOn)
    if (nextOn) { enabled.add(id); cascade.forEach((c) => enabled.add(c)) }
    else { enabled.delete(id); cascade.forEach((c) => enabled.delete(c)) }
    sw.classList.toggle('on', enabled.has(id))
    sw.setAttribute('aria-checked', String(enabled.has(id)))
    // Sin rebuildScene(): el color/glow/fotón de cada nodo y arista afectados se anima solo, en
    // `tick()`, a partir del nuevo `enabled` — nada se reposiciona ni vuelve a "nacer" en el núcleo.
  }
  sw.addEventListener('click', toggle)
  sw.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } })
})

// ---- Disposición seleccionable (3a/3b/3c) — solo reordena posiciones destino; encender/apagar y
// aristas no cambian. ----
document.querySelectorAll('#layoutbar button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#layoutbar button').forEach((x) => x.setAttribute('aria-selected', String(x === b)))
  state.layout = b.dataset.layout
  const positions = LAYOUTS[state.layout](state.nodes)
  state.targetPositions = positions
  state.meshes.forEach((mesh, id) => { mesh.userData.target = positions.get(id) ?? mesh.userData.target })
  state.curves.forEach(({ tube, edge }) => {
    const from = edge.from === 'core' ? new THREE.Vector3(0, 0, 0) : positions.get(edge.from)
    const to = positions.get(edge.to)
    if (!from || !to) return
    const mid = from.clone().add(to).multiplyScalar(0.5)
    mid.y += 0.5
    tube.userData.nextCurve = new THREE.QuadraticBezierCurve3(from, mid, to)
  })
}))

// ---- Interacción: hover (raycaster) resalta vecindario + tooltip; clic vuela la cámara y abre ficha ----
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const tooltip = document.getElementById('tooltip')
const ficha = document.getElementById('ficha')
let hoveredId = null
let cameraFlight = null // { fromPos, toPos, fromTarget, toTarget, t }

function neighborsOf(id) {
  const set = new Set([id])
  state.edges.forEach((e) => {
    if (e.from === id) set.add(e.to)
    if (e.to === id) set.add(e.from)
  })
  return set
}

function setHovered(id) {
  hoveredId = id
  const nbrs = id ? neighborsOf(id) : null
  state.meshes.forEach((mesh, nid) => {
    const dim = nbrs && !nbrs.has(nid)
    mesh.userData.dim = !!dim
  })
  if (id) {
    const n = nodeById(id)
    const isOn = enabled.has(id) // en vivo: `n.on` es solo la foto fija de cuando se construyó la escena
    tooltip.innerHTML = `<b>${n.label}</b>${n.desc}<div class="badge ${isOn ? 'acc' : 'soft'}">${isOn ? 'Activo' : 'Desactivado'}</div>`
    tooltip.style.display = 'block'
  } else {
    tooltip.style.display = 'none'
  }
}

function openFicha(id) {
  const n = nodeById(id)
  if (!n) return
  const isOn = enabled.has(id) // en vivo, igual que en el tooltip
  document.getElementById('fichaBody').innerHTML = `
    <h3>${n.label}</h3>
    <p>${n.desc}</p>
    <div class="stat"><span>Estado</span><span>${isOn ? 'Activo' : 'Desactivado'}</span></div>
    <div class="stat"><span>Categoría</span><span>${CATS[n.cat].label}</span></div>
    <div class="stat"><span>Uso (30 días)</span><span>${Math.round(n.activity * 100)}%</span></div>
  `
  ficha.classList.add('open')
  const mesh = state.meshes.get(id)
  if (mesh) {
    controls.autoRotate = false
    cameraFlight = {
      fromPos: camera.position.clone(),
      toPos: mesh.position.clone().normalize().multiplyScalar(mesh.position.length() + 1.6).add(new THREE.Vector3(0, 0.4, 0)),
      fromTarget: controls.target.clone(),
      toTarget: mesh.position.clone(),
      t: 0,
    }
  }
}
document.querySelector('[data-close]').addEventListener('click', () => ficha.classList.remove('open'))
addEventListener('keydown', (e) => { if (e.key === 'Escape') { ficha.classList.remove('open'); controls.autoRotate = true } })

function updatePointer(e) {
  const r = canvas.getBoundingClientRect()
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1
}
canvas.addEventListener('pointermove', (e) => {
  updatePointer(e)
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects([...state.meshes.values()])
  setHovered(hits[0]?.object.userData.id ?? null)
  if (hoveredId) {
    tooltip.style.left = e.clientX + 'px'
    tooltip.style.top = e.clientY + 'px'
  }
})
canvas.addEventListener('pointerdown', () => { controls.autoRotate = false })
canvas.addEventListener('click', (e) => {
  updatePointer(e)
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects([...state.meshes.values()])
  if (hits[0]) openFicha(hits[0].object.userData.id)
})

// ---- Rendimiento: pausar el bucle fuera de vista/pestaña oculta, y degradar (apagar bloom) si el FPS
// medio cae por debajo de 45 durante un rato — "barra de calidad más comedida" pedida en el plan. ----
let running = true
new IntersectionObserver((entries) => { running = entries[0]?.isIntersecting !== false && !document.hidden }, { threshold: 0.05 }).observe(canvas)
document.addEventListener('visibilitychange', () => { running = !document.hidden })

let bloomOn = true
const fpsWindow = []
let lastFrame = performance.now()
const fpsOut = document.getElementById('fpsOut')
const dprOut = document.getElementById('dprOut')
const bloomOut = document.getElementById('bloomOut')
dprOut.textContent = renderer.getPixelRatio().toFixed(2)

function tick(now) {
  requestAnimationFrame(tick)
  if (!running) return
  const dt = Math.min(0.05, (now - lastFrame) / 1000)
  lastFrame = now
  const t = now / 1000

  fpsWindow.push(1 / Math.max(dt, 0.001))
  if (fpsWindow.length > 60) fpsWindow.shift()
  if (fpsWindow.length === 60) {
    const avg = fpsWindow.reduce((a, b) => a + b, 0) / fpsWindow.length
    fpsOut.textContent = Math.round(avg)
    if (avg < 45 && bloomOn) { bloomOn = false; composer.removePass(bloom); bloomOut.textContent = 'off (fps bajo)' }
    else if (avg >= 55 && !bloomOn) { bloomOn = true; composer.addPass(bloom); bloomOut.textContent = 'on' }
  }

  core.rotation.y += dt * (reducedMotion ? 0.02 : 0.06)
  const sonarR = oscillate(0.7, 1.3, 3.2, 0, t)
  sonarRing.scale.setScalar(sonarR)
  sonarRing.material.opacity = 0.55 * (1 - (sonarR - 0.7) / 0.6)

  state.meshes.forEach((mesh) => {
    mesh.position.lerp(mesh.userData.target, reducedMotion ? 1 : Math.min(1, dt * 3))
    const isOn = enabled.has(mesh.userData.id) // leído en vivo: activar/desactivar no reconstruye nada
    const wantScale = mesh.userData.dim ? 0.75 : 1
    const blink = mesh.userData.blinking ? 0.5 + 0.5 * Math.sin(t * 10) : 1
    mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, wantScale, dt * 6))
    if (mesh.material.emissiveIntensity !== undefined) {
      mesh.material.emissiveIntensity = THREE.MathUtils.lerp(mesh.material.emissiveIntensity, (isOn ? 0.9 : 0) * blink, dt * 6)
      mesh.material.color.lerp(isOn ? mesh.userData.catColor : GRAY_COLOR, dt * 6)
      mesh.material.emissive.lerp(isOn ? mesh.userData.catColor : BLACK_COLOR, dt * 6)
    }
    if (mesh.userData.label) {
      const v = mesh.position.clone().project(camera)
      const x = (v.x * 0.5 + 0.5) * innerWidth
      const y = (-v.y * 0.5 + 0.5) * innerHeight
      const visible = v.z < 1
      mesh.userData.label.style.display = visible ? 'block' : 'none'
      mesh.userData.label.style.left = x + 'px'
      mesh.userData.label.style.top = y + 'px'
      mesh.userData.label.style.opacity = mesh.userData.dim ? 0.3 : 0.96
      if (mesh.userData.iconEl) {
        // Insignia del tamaño real que ocupa la esfera en pantalla: proyectamos el centro y un punto en
        // su borde (a lo largo del eje "derecha" de la cámara) y medimos la distancia en píxeles.
        const edge = mesh.position.clone().addScaledVector(cameraAxis(0), mesh.userData.size).project(camera)
        const apparentR = Math.abs(edge.x - v.x) * 0.5 * innerWidth
        const px = THREE.MathUtils.clamp(apparentR * 2.3, 18, 56)
        const iconEl = mesh.userData.iconEl
        iconEl.style.display = visible ? 'grid' : 'none'
        iconEl.style.left = x + 'px'
        iconEl.style.top = y + 'px'
        iconEl.style.width = px + 'px'
        iconEl.style.height = px + 'px'
        iconEl.style.opacity = mesh.userData.dim ? 0.4 : 1
        iconEl.style.background = isOn ? `${mesh.userData.catColorHex}26` : 'rgba(20,20,24,.75)'
        iconEl.style.border = `1.5px solid ${isOn ? mesh.userData.catColorHex : '#3a3a42'}`
        const svg = iconEl.querySelector('svg')
        if (svg) {
          const iconPx = Math.round(px * 0.52)
          svg.setAttribute('width', iconPx)
          svg.setAttribute('height', iconPx)
          svg.style.color = isOn ? mesh.userData.catColorHex : '#8d8d97'
        }
      }
    }
  })

  state.curves.forEach(({ tube, edge }) => {
    if (tube.userData.nextCurve) {
      // Reconstruir la geometría del tubo al cambiar de disposición sería costoso cada frame: se
      // sustituye una vez y se deja que las esferas (con lerp) hagan la transición visual.
      tube.geometry.dispose()
      tube.geometry = new THREE.TubeGeometry(tube.userData.nextCurve, 24, tube.geometry.parameters.radius, 6, false)
      tube.userData.curve = tube.userData.nextCurve
      tube.userData.nextCurve = null
    }
    // Opacidad de la arista en vivo (encender/apagar cualquiera de los dos extremos la actualiza sola,
    // sin reconstruir el tubo).
    const liveOn = edge.kind === 'core' ? enabled.has(edge.to) : enabled.has(edge.from) && enabled.has(edge.to)
    const wantOpacity = liveOn ? (edge.kind === 'core' ? 0.55 : 0.4) : 0.12
    tube.material.opacity = THREE.MathUtils.lerp(tube.material.opacity, wantOpacity, dt * 6)
  })

  state.photons.forEach((p) => {
    const e = p.userData.edge
    p.visible = e.kind === 'core' ? enabled.has(e.to) : enabled.has(e.from) && enabled.has(e.to)
    p.userData.t = (p.userData.t + dt * (1 / p.userData.speed) * 0.1) % 1
    p.position.copy(p.userData.curve.getPointAt(p.userData.t))
  })

  controls.update()
  if (cameraFlight) {
    cameraFlight.t = Math.min(1, cameraFlight.t + dt * 1.6)
    const e = 1 - Math.pow(1 - cameraFlight.t, 3)
    camera.position.lerpVectors(cameraFlight.fromPos, cameraFlight.toPos, e)
    controls.target.lerpVectors(cameraFlight.fromTarget, cameraFlight.toTarget, e)
    if (cameraFlight.t >= 1) cameraFlight = null
  }

  composer.render()
}

rebuildScene()
requestAnimationFrame(tick)
