// Capturas y GIF de /retos para el PR de R2a (antes/después), en claro y oscuro, a 1440 y 375.
//
// Uso (con la app servida, p. ej. `npm run build && npx vite preview --port 4173`):
//   node docs/design/rediseno-v2/retos-r2/capturar-retos.mjs <carpeta-salida> [url-base] [antes|despues|gif]
//
// Arranca con un perfil de Chrome nuevo (base de datos vacía), salta la bienvenida y genera los datos
// de ejemplo desde Ajustes (que ya incluyen retos propios y misiones). Solo datos de demo: el repo es
// público.
//   antes:   Hoy con la barra lateral, la paleta buscando «reto» y la ficha del plugin (sin página).
//   despues: lista, ficha, crear, paleta, menú del avatar (móvil), sin gamificación y, con un perfil
//            sin datos, el primer día (sin misiones y sin retos). Comprueba consola limpia y que no hay
//            scroll horizontal a 375.
//   gif:     marcar un día con celebración (normal y con movimiento reducido) y un flujo corto: crear
//            desde una plantilla, abrir la ficha, «Hoy no» y deshacer (ffmpeg en el PATH o en FFMPEG).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const [out = 'capturas', base = 'http://localhost:4173', modo = 'antes'] = process.argv.slice(2)
const PORT = 9353
const PORT_VACIO = 9354
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
mkdirSync(out, { recursive: true })

let p
const abrir = async (port) => {
  rmSync(join(tmpdir(), `nx-r2-${port}`), { recursive: true, force: true })
  p = await launch({ port })
}
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
const tema = (t) => p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: t }] })
const scrollH = () => p.eval(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
const avisos = []

/** Salta la bienvenida (y, con `demo`, genera los datos de ejemplo con retos propios y misiones). */
async function prepararDemo(demo = true) {
  await p.viewport(1440, 900)
  await p.goto(base + '/ajustes')
  await sleep(1500)
  await clickText('Saltar la bienvenida')
  await sleep(800)
  await cerrarDialogos()
  if (demo && (await clickText('Generar 6 meses de ejemplo'))) {
    await sleep(400)
    await clickText('Confirmar')
    await sleep(2500)
  }
  await limpiarAvisos()
}

/** Activa o desactiva un plugin escribiendo en los ajustes (hay que recargar después). */
const fijarPlugin = (id, on) =>
  p.eval(`(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('nexus'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
    const tx = db.transaction('settings', 'readwrite')
    const st = tx.objectStore('settings')
    const row = await new Promise((res) => { const r = st.get(1); r.onsuccess = () => res(r.result) })
    st.put({ ...row, plugins: { ...(row?.plugins ?? {}), ${JSON.stringify(id)}: ${on} } })
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
    db.close()
    return true
  })()`)

async function paleta(consulta) {
  await p.key('k', { ctrl: true })
  await sleep(500)
  await p.type(consulta)
  await sleep(500)
}

async function antes() {
  for (const t of ['light', 'dark']) {
    await tema(t)
    const n = t === 'light' ? 'claro' : 'oscuro'
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      await p.viewport(w, h, w < 768)
      await ir('/')
      await guardar(`hoy-${n}-${w}`)
      await ir('/plugins/challenges')
      await guardar(`plugin-retos-${n}-${w}`)
    }
    await p.viewport(1440, 900)
    await ir('/')
    await paleta('reto')
    await guardar(`paleta-${n}-1440`)
    await cerrarDialogos()
    await p.key('Escape')
  }
}

const abrirFila = (titulo) =>
  p.eval(`(() => { const b = [...document.querySelectorAll('[data-challenge-row]')].find(e => e.textContent.trim() === ${JSON.stringify(titulo)}); if (!b) return false; b.click(); return true })()`)

async function despues() {
  for (const t of ['light', 'dark']) {
    await tema(t)
    const n = t === 'light' ? 'claro' : 'oscuro'
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      const movil = w < 768
      await p.viewport(w, h, movil)
      await ir('/retos', 1500)
      await guardar(`lista-${n}-${w}`)
      if (movil && (await scrollH())) avisos.push(`Scroll horizontal en lista ${n} ${w}`)

      if (await abrirFila('Leer 20 minutos')) {
        await sleep(800)
        await guardar(`ficha-${n}-${w}`)
        if (movil && (await scrollH())) avisos.push(`Scroll horizontal con ficha ${n} ${w}`)
        // La ficha larga: el calendario y el registro, más abajo.
        await p.eval(`(() => { const d = document.querySelector('[role=dialog]'); const s = [...d.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); if (s) s.scrollTop = s.scrollHeight })()`)
        await sleep(400)
        await guardar(`ficha-calendario-${n}-${w}`)
        await cerrarDialogos()
      } else avisos.push('No se encontró la fila «Leer 20 minutos»')

      await clickText('Nuevo reto')
      await sleep(500)
      await p.type('Correr 5 km 21 días 2 escudos')
      await sleep(400)
      await guardar(`crear-${n}-${w}`)
      await cerrarDialogos()
    }

    // Una ficha de un reto en pausa y otra de uno terminado, solo a 1440.
    await p.viewport(1440, 900)
    await ir('/retos', 1200)
    if (await abrirFila('Caminar 30 minutos')) {
      await sleep(700)
      await guardar(`ficha-pausa-${n}-1440`)
      await cerrarDialogos()
    }
    if (await abrirFila('Escribir tres líneas de diario')) {
      await sleep(700)
      await guardar(`ficha-terminado-${n}-1440`)
      await cerrarDialogos()
    }

    await ir('/')
    await paleta('reto')
    await guardar(`paleta-${n}-1440`)
    await cerrarDialogos()
    await p.key('Escape')

    // Menú del avatar en móvil: ahí vive Retos.
    await p.viewport(375, 812, true)
    await ir('/')
    await p.eval(`(() => { const b = [...document.querySelectorAll('button[aria-haspopup="menu"]')].find(e => !e.closest('main')); b?.click() })()`)
    await sleep(500)
    await guardar(`menu-avatar-${n}-375`)
    await p.key('Escape')
  }

  // Sin gamificación: sin «+XP», sin «Recompensa» y sin XP en la vista previa.
  await tema('light')
  await p.viewport(1440, 900)
  await fijarPlugin('gamification', false)
  await ir('/retos', 1500)
  await guardar('sin-gamificacion-lista-claro-1440')
  if (await abrirFila('Leer 20 minutos')) {
    await sleep(700)
    await guardar('sin-gamificacion-ficha-claro-1440')
    await cerrarDialogos()
  }
  await fijarPlugin('gamification', true)
  p.close()

  // Primer día: perfil sin datos (sin misiones propuestas ni retos).
  await abrir(PORT_VACIO)
  await prepararDemo(false)
  for (const t of ['light', 'dark']) {
    await tema(t)
    const n = t === 'light' ? 'claro' : 'oscuro'
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      await p.viewport(w, h, w < 768)
      await ir('/retos', 1500)
      await guardar(`primer-dia-${n}-${w}`)
      if (w < 768 && (await scrollH())) avisos.push(`Scroll horizontal en primer día ${n} ${w}`)
    }
  }
  await tema('light')
  await p.viewport(1440, 900)
  await ir('/retos', 1200)
  await clickText('Usar')
  await sleep(600)
  await guardar('crear-desde-plantilla-claro-1440')
  await cerrarDialogos()
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

  const tmp = join(tmpdir(), `nx-r2-gif-${nombre}`)
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

const marca = (titulo) => `[data-challenge-id] button[aria-label="Marcar hoy: ${titulo}"]`

async function gifs() {
  for (const [nombre, reducido, titulo] of [
    ['marcar-dia', false, 'Leer 20 minutos'],
    ['marcar-dia-reduced-motion', true, 'Sin azúcar añadido'],
  ]) {
    await p.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: reducido ? 'reduce' : 'no-preference' },
      ],
    })
    await p.viewport(1280, 800)
    await ir('/retos', 1500)
    await grabar(nombre, async () => {
      await p.click(marca(titulo))
      await sleep(1700)
    })
  }

  // Flujo corto con un perfil sin retos: plantilla -> crear -> ficha -> «Hoy no» -> deshacer.
  p.close()
  await abrir(PORT_VACIO)
  await prepararDemo(false)
  await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await p.viewport(1280, 800)
  await ir('/retos', 1500)
  await grabar('flujo-crear-hoy-no', async () => {
    await clickText('Usar')
    await sleep(900)
    await clickText('Crear reto')
    await sleep(1200)
    await clickText('Ver')
    await sleep(1200)
    await clickText('Hoy no')
    await sleep(1400)
    await clickText('Deshacer')
    await sleep(1300)
  })
}

try {
  await abrir(PORT)
  await prepararDemo(modo !== 'gif' || true)
  if (modo === 'antes') await antes()
  else if (modo === 'despues') await despues()
  else if (modo === 'gif') await gifs()
  else throw new Error(`Modo «${modo}» desconocido (antes|despues|gif)`)
  if (avisos.length) console.log('AVISOS:', avisos)
  if (p.errors.length) console.log('Errores de consola:', p.errors)
} finally {
  p.close()
}
