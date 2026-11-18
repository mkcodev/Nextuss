// Capturas y GIF del primitivo Celebration desde la demo de desarrollo (`dev/celebration.html`).
// Uso: `npx vite --port 5179` y luego `node docs/design/rediseno-v2/fase-1/capturar-celebracion.mjs <salida>`.
// Graba con el screencast de Chrome headless: marca la tarea del medio y guarda el fotograma de
// ~250 ms (en plena celebración) en PNG y, a 900 px, la secuencia completa en GIF (necesita ffmpeg).
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const [salida = 'capturas', base = 'http://localhost:5179'] = process.argv.slice(2)
const out = resolve(salida)
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
mkdirSync(out, { recursive: true })

for (const tema of ['light', 'dark']) {
  const t = tema === 'light' ? 'claro' : 'oscuro'
  for (const [w, h, ancho] of [[900, 360, 1440], [375, 460, 375]]) {
    const p = await launch({ port: 9360 })
    const frames = []
    p.on('Page.screencastFrame', (f) => {
      frames.push({ data: f.data, t: f.metadata.timestamp })
      p.send('Page.screencastFrameAck', { sessionId: f.sessionId })
    })
    await p.viewport(w, h, w < 768)
    await p.goto(`${base}/dev/celebration.html?theme=${tema}`)
    await sleep(600)
    await p.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: w, maxHeight: h, everyNthFrame: 1 })
    await sleep(500)
    const t0 = Date.now() / 1000
    await p.eval(`document.querySelectorAll('input[type=checkbox]')[1].click()`)
    await sleep(1300)
    await p.send('Page.stopScreencast')
    p.close()
    const nombre = `celebracion-${t}-${ancho}`
    const tmp = join(tmpdir(), `nx-celebracion-${nombre}`)
    rmSync(tmp, { recursive: true, force: true })
    mkdirSync(tmp, { recursive: true })
    // Fotograma fijo: el más cercano a 250 ms tras el clic.
    const fijo = frames.reduce((a, b) => (Math.abs(b.t - t0 - 0.25) < Math.abs(a.t - t0 - 0.25) ? b : a))
    writeFileSync(join(tmp, 'fijo.jpg'), Buffer.from(fijo.data, 'base64'))
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', join(tmp, 'fijo.jpg'), join(out, `${nombre}.png`)])
    console.log('·', nombre, `(${frames.length} fotogramas)`)
    if (w === 900) {
      const lista = []
      frames.forEach((f, i) => {
        const n = `f${String(i).padStart(4, '0')}.jpg`
        writeFileSync(join(tmp, n), Buffer.from(f.data, 'base64'))
        lista.push(`file '${n}'`, `duration ${(i < frames.length - 1 ? Math.max(frames[i + 1].t - f.t, 0.01) : 0.6).toFixed(3)}`)
      })
      lista.push(`file 'f${String(frames.length - 1).padStart(4, '0')}.jpg'`)
      writeFileSync(join(tmp, 'lista.txt'), lista.join('\n'))
      execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'lista.txt', '-vf', 'fps=30,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5', join(out, `${nombre}.gif`)], { cwd: tmp })
      console.log('·', `${nombre}.gif`)
    }
  }
}
