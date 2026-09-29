// Modelo de datos COMPARTIDO del mapa de constelación (2D en index.html y 3D en mapa-3d.html): una
// sola función pura `buildConstellation()` calcula nodos y aristas a partir del registro de plugins,
// para que ninguna de las dos vistas tenga ángulos o posiciones puestas a mano. Es el boceto de lo que
// en el PR real será `src/features/plugins/constellation/model.ts`, ya usando `PluginManifest` de
// verdad (`category`, `requires`, `enhances`) en vez de este registro de mentira.
export const CATS = {
  ritual: { label: 'Ritual de mañana', color: '#7c84e8' },
  hacer: { label: 'Hacer', color: '#42c9b8' },
  motivacion: { label: 'Motivación', color: '#f0a25e' },
  analisis: { label: 'Análisis', color: '#6fa8e0' },
  integraciones: { label: 'Integraciones', color: '#e28fce' },
}

// Espejo de `registry.ts` sin los 4 plugins de núcleo (esos se resumen en el hub central) — más
// `requires` (dependencia dura, ya existe en el código real) y `enhances` (dependencia blanda,
// propuesta en el plan de #98 para Virtualización→Rutinas/Check-in/Lanzadores). `activity` (0-1) imita
// «uso en los últimos 30 días» para el brillo/velocidad del fotón y la idea 5 (sugerencia de ruido).
export const PLUGINS = [
  { id: 'virtualization', label: 'Virtualización', desc: 'Transmisión, escaneo, presencia y arranque de la rutina.', icon: 'radar', cat: 'ritual', on: true, activity: 0.9, enhances: ['routines', 'checkin', 'launchers'] },
  { id: 'checkin', label: 'Check-in', desc: 'Energía, ánimo y foco al empezar el día.', icon: 'clipboard-check', cat: 'ritual', on: true, activity: 0.8 },
  { id: 'routines', label: 'Rutinas', desc: 'Secuencias de pasos con temporizador.', icon: 'repeat', cat: 'ritual', on: true, activity: 0.7 },
  { id: 'dayTime', label: 'Tiempo de hoy', desc: 'Cuánto día queda y avisos entre bloques.', icon: 'clock', cat: 'hacer', on: true, activity: 0.6 },
  { id: 'habits', label: 'Hábitos', desc: 'Hábitos diarios con rachas y recordatorios.', icon: 'list-checks', cat: 'hacer', on: true, activity: 0.75 },
  { id: 'focus', label: 'Foco', desc: 'Pomodoro y sesiones de foco sobre una tarea.', icon: 'timer', cat: 'hacer', on: true, activity: 0.5 },
  { id: 'launchers', label: 'Lanzadores', desc: 'Reglas «cuando pase X, haz Y».', icon: 'workflow', cat: 'hacer', on: true, activity: 0.4 },
  { id: 'gamification', label: 'Gamificación', desc: 'XP, niveles, atributos y logros.', icon: 'trophy', cat: 'motivacion', on: true, activity: 0.65 },
  { id: 'weeklyReview', label: 'Rev. semanal', desc: 'Cierra la semana y prepara la siguiente.', icon: 'notebook-pen', cat: 'analisis', on: true, activity: 0.2, requires: ['planning'] },
  { id: 'stats', label: 'Estadísticas', desc: 'Gráficas, tendencias e insights.', icon: 'bar-chart-3', cat: 'analisis', on: true, activity: 0.15 },
  { id: 'ai', label: 'IA', desc: 'Divide tareas y sugiere pasos (necesita clave).', icon: 'sparkles', cat: 'integraciones', on: true, activity: 0.55 },
  { id: 'telegram', label: 'Telegram', desc: 'Captura y avisos desde un bot.', icon: 'send', cat: 'integraciones', on: false, activity: 0 },
]

const BY_ID = new Map(PLUGINS.map((p) => [p.id, p]))

/** Nodos que dependientes directos e indirectos perderían si `id` se apagara (recorre `requires` hacia
 * fuera), y los que arrastraría encender `id` (sus `requires` hacia dentro) — mismo sentido que
 * `planToggle` en `src/features/plugins/resolve.ts`, aquí en miniatura para el mockup. */
export function computeCascade(id, nextOn) {
  const affected = new Set()
  const visit = (pid, dir) => {
    const related = dir === 'off'
      ? PLUGINS.filter((p) => p.requires?.includes(pid)).map((p) => p.id) // quién depende de mí
      : BY_ID.get(pid)?.requires ?? [] // de quién dependo yo
    for (const r of related) {
      if (affected.has(r)) continue
      affected.add(r)
      visit(r, dir)
    }
  }
  visit(id, nextOn ? 'on' : 'off')
  return [...affected]
}

function polar(r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) }
}

/** Reparte `count` nodos en un círculo sin solapes ni ángulos a mano: cada uno ocupa el centro de su
 * porción `360/count`, así que crece o encoge solo con añadir/quitar plugins del registro. */
function evenAngles(count, offset = 0) {
  const step = 360 / count
  return Array.from({ length: count }, (_, i) => offset + i * step + step / 2)
}

/**
 * `focusId` ausente → mapa completo: anillo 1 = categoría "ritual" (el ritual de mañana, más cerca del
 * núcleo por ser la secuencia de entrada), anillo 2 = el resto, agrupado por categoría para que las
 * líneas de flujo no se crucen.
 * `focusId` presente → ego-red: un único anillo con el plugin y sus vecinos directos (`requires` en
 * ambos sentidos + `enhances`), repartidos a partes iguales — el mini-mapa de cada ficha.
 */
export function buildConstellation({ enabledSet, focusId } = {}) {
  const isOn = (id) => enabledSet ? enabledSet.has(id) : BY_ID.get(id)?.on

  let placed
  if (focusId) {
    const focus = BY_ID.get(focusId)
    if (!focus) return { nodes: [], edges: [] }
    const neighborIds = new Set([
      ...(focus.requires ?? []),
      ...(focus.enhances ?? []),
      ...PLUGINS.filter((p) => p.requires?.includes(focusId) || p.enhances?.includes(focusId)).map((p) => p.id),
    ])
    neighborIds.delete(focusId)
    const ids = [focusId, ...neighborIds]
    const angles = evenAngles(ids.length)
    placed = ids.map((id, i) => ({ ...BY_ID.get(id), ring: 1, angle: angles[i] }))
  } else {
    const ritual = PLUGINS.filter((p) => p.cat === 'ritual')
    const rest = PLUGINS.filter((p) => p.cat !== 'ritual')
    const a1 = evenAngles(ritual.length)
    const a2 = evenAngles(rest.length, 20)
    placed = [
      ...ritual.map((p, i) => ({ ...p, ring: 1, angle: a1[i] })),
      ...rest.map((p, i) => ({ ...p, ring: 2, angle: a2[i] })),
    ]
  }

  const nodes = placed.map((p) => ({ ...p, on: isOn(p.id), here: p.id === focusId }))
  const edges = []
  for (const n of nodes) {
    edges.push({ from: 'core', to: n.id, kind: 'core', color: CATS[n.cat].color, on: n.on })
  }
  const placedIds = new Set(nodes.map((n) => n.id))
  for (const p of PLUGINS) {
    for (const target of p.enhances ?? []) {
      if (placedIds.has(p.id) && placedIds.has(target)) {
        edges.push({ from: p.id, to: target, kind: 'enhances', color: CATS[p.cat].color, on: isOn(p.id) && isOn(target) })
      }
    }
  }
  return { nodes, edges, radii: focusId ? { r1: 82 } : { r1: 108, r2: 196 } }
}

export function nodePosition(node, radii) {
  const r = node.ring === 1 ? radii.r1 : radii.r2
  return polar(r, node.angle)
}
