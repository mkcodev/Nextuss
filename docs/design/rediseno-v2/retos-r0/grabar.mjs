// Retos R0 · graba con Chrome headless (screencast de DevTools) y monta los GIF con ffmpeg:
//   1. «completar» de cada vista (d, b, c), normal y con movimiento reducido (?motion=off):
//      - marca el día de «Sin pantallas tras las 23:00» → Celebration sobre la fila o la tarjeta;
//      - la misión «Completa 5 tareas hoy» se cumple (simula una tarea hecha en Hoy) → solo se actualiza;
//      - marca el último día de «Leer 20 minutos» → Celebration y aviso «Reto cumplido» con Deshacer.
//   2. el selector de vista: marca un día en Mezcla y recorre Cadena y Horizonte con el
//      MISMO dato demo (el día marcado sigue marcado en todas), y vuelve a Mezcla.
// Requiere el servidor local: npx serve -l 5174 docs/design/rediseno-v2
// Uso: node grabar.mjs [d|b|c ...] [--theme=dark|light] [--solo=completar|selector]
// Salida: capturas/<v>-completar.gif, capturas/<v>-completar-reducido.gif y capturas/selector.gif
// Si hay gifsicle en el PATH (o en GIFSICLE), optimiza los GIF después.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1]
const theme = flag('theme') || 'dark'
const solo = flag('solo')
const variantes = args.filter((a) => !a.startsWith('--')).length ? args.filter((a) => !a.startsWith('--')) : ['d', 'b', 'c']
const BASE = process.env.BASE || 'http://localhost:5174/retos-r0/'
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const W = 1440
const H = 1000
const out = join(here, 'capturas')
mkdirSync(out, { recursive: true })

const p = await launch({ port: 9372 })
await p.viewport(W, H)
let frames = []
p.on('Page.screencastFrame', (f) => {
  frames.push({ data: f.data, t: f.metadata.timestamp })
  p.send('Page.screencastFrameAck', { sessionId: f.sessionId })
})

// Graba `guion` (una función async) tras cargar `url` y monta capturas/<name>.gif.
async function grabar(name, url, guion) {
  await p.goto(url)
  frames = []
  await p.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
  await guion()
  await p.send('Page.stopScreencast')
  const tmp = join(tmpdir(), `nx-retos-${name}`)
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp, { recursive: true })
  const list = []
  frames.forEach((f, i) => {
    const fn = `f${String(i).padStart(5, '0')}.jpg`
    writeFileSync(join(tmp, fn), Buffer.from(f.data, 'base64'))
    const d = i < frames.length - 1 ? Math.max(frames[i + 1].t - f.t, 0.01) : 1
    list.push(`file '${fn}'`, `duration ${d.toFixed(3)}`)
  })
  list.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`)
  writeFileSync(join(tmp, 'lista.txt'), list.join('\n'))
  // Recorte a la zona de contenido (sin la barra lateral, el panel ni la navbar) para que se vea grande.
  execFileSync(
    FFMPEG,
    ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'lista.txt', '-vf', 'fps=20,crop=896:940:224:48,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle', join(out, `${name}.gif`)],
    { cwd: tmp },
  )
  rmSync(tmp, { recursive: true, force: true })
  console.log(`${frames.length} fotogramas → capturas/${name}.gif`)
}

if (solo !== 'selector')
  for (const v of variantes)
    for (const reducido of [false, true])
      await grabar(`${v}-completar${reducido ? '-reducido' : ''}`, `${BASE}?v=${v}&vista=completar&bare=1&theme=${theme}${reducido ? '&motion=off' : ''}`, () => sleep(6400))

if (solo !== 'completar')
  await grabar('selector', `${BASE}?v=d&vista=lista&bare=1&theme=${theme}`, async () => {
    await sleep(900)
    await p.click('[data-marcar="pantallas"]') // el mismo dato en todas las vistas: este día queda marcado
    await sleep(1900)
    for (const v of ['b', 'c', 'd']) {
      await p.click(`[data-view="${v}"]`)
      await sleep(1500)
    }
  })

if (p.errors.length) console.log(`ERRORES:\n${p.errors.join('\n')}`)
p.close()
