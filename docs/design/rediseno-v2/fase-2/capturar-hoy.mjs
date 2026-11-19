// Capturas y GIF de Hoy para el PR de la fase 2 (antes/después), en claro y oscuro, a 1440 y 375.
//
// Uso (con la app servida, p. ej. `npm run build && npx vite preview --port 4173`):
//   node docs/design/rediseno-v2/fase-2/capturar-hoy.mjs <carpeta-salida> [url-base] [capturas|gif]
//
// Arranca con un perfil de Chrome nuevo (base de datos vacía), salta la bienvenida, genera los datos
// de ejemplo desde Ajustes y añade tres tareas de ejemplo para hoy (una en curso, otra a continuación
// y una sin hora) y una sesión de foco, para que el bloque Ahora y «Tu día en números» tengan algo que
// enseñar. Solo datos de demo: el repo es público.
//   capturas: arriba de Hoy y, aparte, «Tu día en números» (si existe; en el «antes», el final de Hoy).
//   gif:      completar la tarea en curso desde «Ahora», con movimiento normal y con movimiento
//             reducido emulado (ffmpeg en el PATH o en FFMPEG).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const [out = 'capturas', base = 'http://localhost:4173', modo = 'capturas'] = process.argv.slice(2)
const PORT = 9352
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
rmSync(join(tmpdir(), `nx-r2-${PORT}`), { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const p = await launch({ port: PORT })
const clickText = (t) =>
  p.eval(`(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim().includes(${JSON.stringify(t)}) && !e.disabled); if (!b) return false; b.click(); return true })()`)
const hasDialog = () => p.eval(`!!document.querySelector('[role=dialog]')`)
async function cerrarDialogos() {
  for (let i = 0; i < 4 && (await hasDialog()); i++) {
    await p.key('Escape')
    await sleep(350)
  }
}
async function limpiarAvisos() {
  for (let i = 0; i < 40; i++) {
    const quedan = await p.eval(`(() => { document.querySelectorAll('.z-toast button[aria-label="Cerrar aviso"]').forEach(b => b.click()); return !!document.querySelector('.z-toast [role=status], .z-toast [role=alert]') })()`)
    if (!quedan) return
    await sleep(250)
  }
}
async function ir(ruta) {
  await p.goto(base + ruta)
  await sleep(900)
  await cerrarDialogos()
  await limpiarAvisos()
}
const guardar = async (nombre) => {
  writeFileSync(join(out, `${nombre}.png`), await p.shot(false))
  console.log('·', nombre)
}

/** Tres tareas de hoy y una sesión de foco, escritas directamente en IndexedDB (la app las lee al recargar). */
const sembrar = () =>
  p.eval(`(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('nexus'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const key = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
    const hm = (min) => pad(Math.floor(min / 60)) + ':' + pad(min % 60)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const start = Math.max(0, Math.floor((nowMin - 35) / 5) * 5)
    const proyectos = await new Promise((res) => { const r = db.transaction('projects').objectStore('projects').getAll(); r.onsuccess = () => res(r.result) })
    const proyecto = proyectos.find((x) => !x.deletedAt) ?? proyectos[0]
    const tarea = (t) => ({ status: 'planned', postponedCount: 0, createdAt: Date.now(), deletedAt: 0, sortKey: Date.now(), tagIds: [], xpAwarded: 0, scheduledDate: key, ...t })
    const tx = db.transaction(['tasks', 'focusSessions'], 'readwrite')
    const tasks = tx.objectStore('tasks')
    tasks.add(tarea({ title: 'Preparar la propuesta de diseño', scheduledStart: hm(start), scheduledEnd: hm(Math.min(start + 90, 1439)), priority: 2, energy: 'high', projectId: proyecto?.id }))
    tasks.add(tarea({ title: 'Revisar el presupuesto del trimestre', scheduledStart: hm(Math.min(start + 105, 1380)), scheduledEnd: hm(Math.min(start + 150, 1439)), priority: 3, energy: 'medium' }))
    tasks.add(tarea({ title: 'Llamar al proveedor', priority: 1, estimateMin: 15 }))
    tx.objectStore('focusSessions').add({ start: Date.now() - 3 * 3600e3, end: Date.now() - 3 * 3600e3 + 50 * 60e3, durationMin: 50, interruptions: 0 })
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
    db.close()
    return true
  })()`)

const alNumeros = () =>
  p.eval(`(() => {
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === 'Tu día en números')
    if (h) { h.closest('section').scrollIntoView({ block: 'center' }); return true }
    const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight
    window.scrollTo(0, document.body.scrollHeight)
    return false
  })()`)

async function grabarCompletar(nombre, reducido) {
  await p.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: reducido ? 'reduce' : 'no-preference' },
    ],
  })
  await p.viewport(1280, 800)
  await ir('/')
  await p.eval(`document.querySelector('section[aria-labelledby]')?.closest('.relative')?.scrollIntoView({ block: 'center' })`)
  await sleep(400)
  const frames = []
  const onFrame = (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp })
    p.send('Page.screencastFrameAck', { sessionId: f.sessionId })
  }
  p.on('Page.screencastFrame', onFrame)
  await p.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 })
  await sleep(700)
  await clickText('Hecha')
  await sleep(1600)
  await p.send('Page.stopScreencast')
  await sleep(200)

  const tmp = join(tmpdir(), `nx-fase2-${nombre}`)
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const list = []
  frames.forEach((f, i) => {
    const file = `f${String(i).padStart(5, '0')}.jpg`
    writeFileSync(join(tmp, file), Buffer.from(f.data, 'base64'))
    const d = i < frames.length - 1 ? Math.max(frames[i + 1].t - f.t, 0.01) : 0.5
    list.push(`file '${file}'`, `duration ${d.toFixed(3)}`)
  })
  list.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`)
  writeFileSync(join(tmp, 'lista.txt'), list.join('\n'))
  execFileSync(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'lista.txt'),
    '-vf', 'fps=20,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    join(out, `${nombre}.gif`),
  ])
  console.log('·', nombre, `(${frames.length} fotogramas)`)
}

try {
  await p.viewport(1440, 900)
  await p.goto(base + '/ajustes')
  await sleep(1500)
  await clickText('Saltar la bienvenida')
  await sleep(800)
  await cerrarDialogos()
  if (await clickText('Generar 6 meses de ejemplo')) {
    await sleep(400)
    await clickText('Confirmar')
    await sleep(2500)
  }
  await limpiarAvisos()
  await sembrar()

  if (modo === 'gif') {
    await grabarCompletar('celebracion', false)
    await sembrar() // otra tarea en curso para la segunda toma
    await grabarCompletar('celebracion-reduced-motion', true)
  } else {
    for (const tema of ['light', 'dark']) {
      await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] })
      const t = tema === 'light' ? 'claro' : 'oscuro'
      for (const [w, h] of [[1440, 900], [375, 812]]) {
        await p.viewport(w, h, w < 768)
        await ir('/')
        await guardar(`hoy-${t}-${w}`)
        await alNumeros()
        await sleep(400)
        await guardar(`hoy-numeros-${t}-${w}`)
      }
    }
  }
  if (p.errors.length) console.log('Errores de consola:', p.errors)
} finally {
  p.close()
}
