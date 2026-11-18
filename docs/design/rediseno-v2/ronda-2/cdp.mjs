// Ayudante mínimo para Chrome headless por el protocolo de DevTools (sin dependencias).
// Lo usan capturar.mjs (capturas fijas) y grabar.mjs (GIF de las interacciones).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function launch({ port = 9334 } = {}) {
  const CHROME =
    process.env.CHROME ||
    ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
  const proc = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--force-color-profile=srgb', `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `nx-r2-${port}`)}`, 'about:blank'])
  let url
  for (let i = 0; i < 60 && !url; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      url = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl
    } catch {}
    if (!url) await sleep(200)
  }
  if (!url) throw new Error('Chrome no respondió')
  const ws = new WebSocket(url)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map()
  const listeners = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? rej(new Error(m.error.message)) : res(m.result)
    } else if (m.method) (listeners.get(m.method) || []).forEach((f) => f(m.params))
  })
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id
      pending.set(i, { res, rej })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const on = (method, f) => listeners.set(method, [...(listeners.get(method) || []), f])
  const once = (method) => new Promise((r) => on(method, r))
  await send('Page.enable')
  await send('Runtime.enable')
  const errors = []
  on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text))
  on('Runtime.consoleAPICalled', (p) => p.type === 'error' && errors.push(p.args.map((a) => a.value ?? a.description).join(' ')))

  const page = {
    send,
    on,
    errors,
    async viewport(w, h, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile })
    },
    async goto(u) {
      const loaded = once('Page.loadEventFired')
      await send('Page.navigate', { url: u })
      await loaded
      await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true })
      await sleep(300)
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      return r.result.value
    },
    async shot(full = false) {
      let clip
      if (full) {
        const h = await page.eval('Math.ceil(document.documentElement.scrollHeight)')
        const w = await page.eval('document.documentElement.clientWidth')
        clip = { x: 0, y: 0, width: w, height: h, scale: 1 }
      }
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(clip ? { clip } : {}) })
      return Buffer.from(r.data, 'base64')
    },
    async key(key, mods = {}) {
      const code = key.length === 1 ? `Key${key.toUpperCase()}` : key
      const modifiers = (mods.alt ? 1 : 0) | (mods.ctrl ? 2 : 0) | (mods.meta ? 4 : 0) | (mods.shift ? 8 : 0)
      const text = key.length === 1 && !mods.ctrl && !mods.meta ? key : undefined
      const vk = { Escape: 27, Enter: 13, ArrowDown: 40, ArrowUp: 38 }[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0)
      await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, text, modifiers, windowsVirtualKeyCode: vk })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk })
    },
    async type(str, delay = 45) {
      for (const ch of str) {
        await send('Input.insertText', { text: ch })
        await sleep(delay)
      }
    },
    async click(selector) {
      const r = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2] })()`)
      if (!r) throw new Error(`No existe ${selector}`)
      await page.move(r[0], r[1])
      for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: r[0], y: r[1], button: 'left', clickCount: 1 })
    },
    async move(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    },
    close() {
      ws.close()
      proc.kill()
    },
  }
  return page
}
