// Graba la demo de las interacciones de la pasada 1 (completar, paleta, tema, captura rápida y foco)
// con Chrome headless (screencast del protocolo de DevTools) y la monta en GIF y MP4 con ffmpeg.
// Requiere el servidor local: npx serve -l 5174 docs/design/rediseno-v2/ronda-2
// Uso: node grabar.mjs <direccion> [light|dark] [guiada]   ·   Salida: capturas/<direccion>-demo.{gif,mp4}
// Con «guiada» graba la demo guiada de la segunda pasada (?demo=1) en capturas/<direccion>-guiada.{gif,mp4}.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { launch, sleep } from './cdp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const [dir = 'linea', theme, modo] = process.argv.slice(2)
const guiada = modo === 'guiada'
const name = `${dir}-${guiada ? 'guiada' : 'demo'}`
const W = 1280
const H = 800
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const frames = []
const tmp = join(tmpdir(), `nx-grabar-${dir}`)
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })

const p = await launch({ port: 9350 })
await p.viewport(W, H)
p.on('Page.screencastFrame', (f) => {
  frames.push({ data: f.data, t: f.metadata.timestamp })
  p.send('Page.screencastFrameAck', { sessionId: f.sessionId })
})
const url = `http://localhost:5174/direcciones/${dir}/?bare=1${theme ? `&theme=${theme}` : ''}${guiada ? '&demo=1' : ''}`
await p.goto(url)
await p.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
await p.goto(url) // segunda carga ya grabando: así sale la entrada de página
const center = (sel) => p.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`)
const top = () => p.eval('scrollTo(0, 0)')

if (guiada) {
  const t0 = Date.now()
  while (!(await p.eval('window.NX_DEMO_DONE === true')) && Date.now() - t0 < 120000) await sleep(400)
  await sleep(600)
} else {
await sleep(1800)
// Barra lateral: el puntero recorre unos elementos.
for (const y of [112, 142, 172, 202, 232]) {
  await p.move(110, y)
  await sleep(160)
}
await p.move(640, 400)
await sleep(400)
// 1. Completar: con la tecla x y con clic en el estado.
await center('.plan')
await sleep(600)
await p.key('x')
await sleep(1500)
await p.click('.rows-plan .row-en-curso .status-btn')
await sleep(1600)
// 3 + 7. Paleta: filtrar y ejecutar «cambiar tema».
await top()
await sleep(300)
await p.key('k', { ctrl: true })
await sleep(900)
await p.type('tema', 110)
await sleep(700)
await p.key('Enter')
await sleep(1700)
// 4. Captura rápida con detección de fecha, hora, prioridad, proyecto y duración.
await center('.plan')
await sleep(400)
await p.key('i')
await sleep(700)
await p.type('Revisar el contrato del local mañana 10:00 p2 #trabajo 30 min ', 55)
await sleep(1000)
await p.key('Enter')
await sleep(1800)
// 8. Modo foco y salida.
await top()
await sleep(300)
await p.key('f')
await sleep(3800)
await p.click('.sub:not(.is-done)')
await sleep(1200)
await p.key('Escape')
await sleep(1300)
// 7. Tema otra vez, desde el botón.
await p.key('t')
await sleep(1600)
}
await p.send('Page.stopScreencast')
p.close()

// Montaje: cada fotograma dura hasta el siguiente.
const list = []
frames.forEach((f, i) => {
  const name = `f${String(i).padStart(5, '0')}.jpg`
  writeFileSync(join(tmp, name), Buffer.from(f.data, 'base64'))
  const d = i < frames.length - 1 ? Math.max(frames[i + 1].t - f.t, 0.01) : 0.5
  list.push(`file '${name}'`, `duration ${d.toFixed(3)}`)
})
list.push(`file 'f${String(frames.length - 1).padStart(5, '0')}.jpg'`)
writeFileSync(join(tmp, 'lista.txt'), list.join('\n'))
const out = join(here, 'capturas')
mkdirSync(out, { recursive: true })
const run = (args) => execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'lista.txt'), ...args], { cwd: tmp })
run(['-vf', 'fps=30,scale=1280:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', join(out, `${name}.mp4`)])
run(['-vf', 'fps=15,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle', join(out, `${name}.gif`)])
console.log(`${frames.length} fotogramas → capturas/${name}.gif y .mp4`)
