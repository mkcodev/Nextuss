// Capturas de los mockups con Chrome headless + protocolo de DevTools (sin dependencias).
// Emula el ancho real (375 px no se puede con --window-size: Chrome tiene un mínimo de ventana)
// y captura la página completa.
//
// Uso: node capturar.mjs [direccion...]   (por defecto: todas las de direcciones/)
// Salida: capturas/<direccion>-<claro|oscuro>-<1440|375>.png
// Variables: CHROME=<ruta a chrome>, VIEWPORT=1 para capturar solo el primer viewport.
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const CHROME =
  process.env.CHROME ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const PORT = 9333
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(here, 'direcciones'))
const sizes = [
  { w: 1440, h: 900, mobile: false },
  { w: 375, h: 812, mobile: true },
]
const themes = [
  ['light', 'claro'],
  ['dark', 'oscuro'],
]
const onlyViewport = process.env.VIEWPORT === '1'
const OUT = process.env.OUT || join(here, 'capturas')
mkdirSync(OUT, { recursive: true })

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${join(tmpdir(), 'nx-capturas')}`,
  'about:blank',
])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cdp() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(200)
  }
  throw new Error('Chrome no respondió')
}

const ws = new WebSocket(await cdp())
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pending = new Map()
const waiters = []
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result)
  } else if (msg.method) {
    waiters.filter((w) => w.method === msg.method).forEach((w) => w.res(msg.params))
  }
})
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id
    pending.set(i, { res, rej })
    ws.send(JSON.stringify({ id: i, method, params }))
  })
const once = (method) => new Promise((res) => waiters.push({ method, res }))

await send('Page.enable')
for (const dir of dirs) {
  const url = pathToFileURL(join(here, 'direcciones', dir, 'index.html')).href
  for (const s of sizes) {
    for (const [theme, label] of themes) {
      await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: s.mobile })
      const loaded = once('Page.loadEventFired')
      await send('Page.navigate', { url: `${url}?theme=${theme}&static=1` })
      await loaded
      await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true })
      await sleep(400)
      let clip
      if (!onlyViewport) {
        const { cssContentSize } = await send('Page.getLayoutMetrics')
        clip = { x: 0, y: 0, width: s.w, height: Math.ceil(cssContentSize.height), scale: 1 }
      }
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !onlyViewport, ...(clip ? { clip } : {}) })
      const out = join(OUT, `${dir}-${label}-${s.w}.png`)
      writeFileSync(out, Buffer.from(data, 'base64'))
      console.log('ok', out)
    }
  }
}
ws.close()
chrome.kill()
