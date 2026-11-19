// Capturas y GIF de R2b + R3 (solo lo que cambia, sin «antes»), en claro y oscuro, a 1440 y 375.
//
// Uso (con la app servida, p. ej. `npm run build && npx vite preview --port 4173`):
//   node docs/design/rediseno-v2/retos-r2/capturar-r2b-r3.mjs <carpeta-salida> [url-base] [capturas|gif]
//
// Arranca con un perfil de Chrome nuevo (base de datos vacía), salta la bienvenida y genera los datos de
// ejemplo desde Ajustes. Solo datos de demo: el repo es público.
//   capturas: Cadena y Horizonte (con el selector), la celda «Retos» de Hoy y el reto cumplido (aviso y
//             fila en «Terminados»). Comprueba consola limpia y que no hay scroll horizontal a 375.
//   gif:      marcar el último día de un reto en /retos y en Hoy, normal y con movimiento reducido
//             (ffmpeg en el PATH o en FFMPEG).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const [out = 'capturas', base = 'http://localhost:4173', modo = 'capturas'] = process.argv.slice(2)
const PORT = 9358
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
mkdirSync(out, { recursive: true })

rmSync(join(tmpdir(), `nx-r2-${PORT}`), { recursive: true, force: true })
const p = await launch({ port: PORT })
const avisos = []

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
async function ir(ruta, espera = 900) {
  await p.goto(base + ruta)
  await sleep(espera)
  await cerrarDialogos()
  await limpiarAvisos()
}
const guardar = async (nombre) => {
  writeFileSync(join(out, `${nombre}.png`), await p.shot(false))
  console.log('·', nombre)
}
/** Captura solo el rectángulo de un elemento (con margen): Hoy es muy largo y lo nuevo es una sección. */
const guardarElemento = async (selector, nombre, margen = 16) => {
  const r = await p.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + scrollX, b.top + scrollY, b.width, b.height] })()`)
  if (!r) throw new Error(`No existe ${selector}`)
  const x = Math.max(0, r[0] - margen)
  const y = Math.max(0, r[1] - margen)
  const clip = { x, y, width: r[2] + (r[0] - x) + margen, height: r[3] + (r[1] - y) + margen, scale: 1 }
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip })
  writeFileSync(join(out, `${nombre}.png`), Buffer.from(shot.data, 'base64'))
  console.log('·', nombre)
}
const tema = (t, reducido = false) =>
  p.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: t },
      { name: 'prefers-reduced-motion', value: reducido ? 'reduce' : 'no-preference' },
    ],
  })
const scrollH = () => p.eval(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
const centrar = (sel) => p.eval(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({ block: 'center' })`)
const vista = (nombre) =>
  p.eval(`(() => { const r = [...document.querySelectorAll('[role=radiogroup][aria-label="Vista de los retos propios"] [role=radio]')].find(e => e.textContent.trim() === ${JSON.stringify(nombre)}); if (!r) return false; r.click(); return true })()`)
const marca = (titulo) => `[data-challenge-id] button[aria-label="Marcar hoy: ${titulo}"]`

async function prepararDemo() {
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
}

/** Crea un reto de un día desde el diálogo (hoy es su último día: marcarlo lo cierra). */
async function crearRetoDeUnDia(titulo) {
  await ir('/retos', 1400)
  await clickText('Nuevo reto')
  await sleep(600)
  await p.type(`${titulo} 1 día 0 escudos`)
  await sleep(400)
  await clickText('Crear reto')
  await sleep(1200)
  await limpiarAvisos()
}

async function capturas() {
  for (const t of ['light', 'dark']) {
    await tema(t)
    const n = t === 'light' ? 'claro' : 'oscuro'
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      const movil = w < 768
      await p.viewport(w, h, movil)

      for (const [clave, nombre] of [['cadena', 'Cadena'], ['horizonte', 'Horizonte']]) {
        await ir('/retos', 1400)
        await vista(nombre)
        await sleep(600)
        await centrar('#retos-propios')
        await sleep(300)
        await guardar(`${clave}-${n}-${w}`)
        if (movil && (await scrollH())) avisos.push(`Scroll horizontal en ${clave} ${n} ${w}`)
      }

      await ir('/', 1800)
      await centrar('section a[href="/retos"]')
      await sleep(400)
      // «Tu día en números» entera (Foco, Tareas, Progreso y Retos): la celda nueva casa con las otras.
      await p.eval(`document.querySelector('section a[href="/retos"]').closest('section').parentElement.closest('section').setAttribute('data-captura', 'numeros')`)
      await guardarElemento('[data-captura=numeros]', `hoy-retos-${n}-${w}`)
      if (movil && (await scrollH())) avisos.push(`Scroll horizontal en Hoy ${n} ${w}`)
    }
  }

  // El reto cumplido: aviso y fila en «Terminados» (solo a 1440 y, en claro, a 375).
  for (const [t, n, w, h, titulo] of [
    ['light', 'claro', 1440, 900, 'Tender la cama'],
    ['dark', 'oscuro', 1440, 900, 'Pasear al perro'],
    ['light', 'claro', 375, 812, 'Regar las plantas'],
  ]) {
    await tema(t)
    await p.viewport(w, h, w < 768)
    await crearRetoDeUnDia(titulo)
    await vista('Cadena')
    await sleep(500)
    await centrar(marca(titulo))
    await sleep(400)
    await p.click(marca(titulo))
    await sleep(1100) // la celebración ya pasó; el aviso sigue
    await p.eval(`document.querySelector('.z-toast')?.scrollIntoView?.()`)
    await guardar(`reto-cumplido-${n}-${w}`)
  }
}

/** Graba la pantalla con el screencast del protocolo y la convierte en GIF. */
async function grabar(nombre, accion) {
  const frames = []
  const onFrame = (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp })
    p.send('Page.screencastFrameAck', { sessionId: f.sessionId })
  }
  p.on('Page.screencastFrame', onFrame)
  await p.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1 })
  await sleep(700)
  await accion()
  await p.send('Page.stopScreencast')
  await sleep(200)

  const tmp = join(tmpdir(), `nx-r2b-gif-${nombre}`)
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

async function gifs() {
  // Primero los de Hoy: allí caben 3 retos y un reto cerrado hoy se queda como «cumplido» (ocuparía sitio).
  for (const [nombre, reducido, titulo, donde, nuevo] of [
    ['hoy-marcar-reto', false, 'Beber un vaso de agua', '/', true],
    ['hoy-marcar-reto-reduced-motion', true, 'Sin azúcar añadido', '/', false],
    ['reto-cumplido', false, 'Escribir un agradecimiento', '/retos', true],
    ['reto-cumplido-reduced-motion', true, 'Estirar diez minutos', '/retos', true],
  ]) {
    await tema('light', reducido)
    await p.viewport(1280, 800)
    if (nuevo) await crearRetoDeUnDia(titulo)
    await ir(donde, 1800)
    if (donde === '/') await centrar(marca(titulo))
    else {
      await vista('Cadena')
      await sleep(500)
      await centrar(marca(titulo))
    }
    await sleep(500)
    await grabar(nombre, async () => {
      await p.click(marca(titulo))
      await sleep(2200)
    })
  }
}

try {
  await prepararDemo()
  if (modo === 'capturas') await capturas()
  else if (modo === 'gif') await gifs()
  else throw new Error(`Modo «${modo}» desconocido (capturas|gif)`)
  if (avisos.length) console.log('AVISOS:', avisos)
  console.log('Errores de consola:', p.errors.length ? p.errors : 'ninguno')
} finally {
  p.close()
}
