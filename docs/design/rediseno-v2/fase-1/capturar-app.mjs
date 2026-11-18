// Capturas de la app real para los PRs de la fase 1 (antes/después), en claro y oscuro, a 1440 y 375.
//
// Uso (con la app servida, p. ej. `npm run build && npx vite preview --port 4173`):
//   node docs/design/rediseno-v2/fase-1/capturar-app.mjs <carpeta-salida> [url-base] [pantallas]
//   pantallas: lista separada por comas (hoy,ajustes,plugin,dialogo,menu,celebracion). Por defecto, las cinco primeras.
//
// Arranca con un perfil de Chrome nuevo (base de datos vacía), salta la bienvenida, cierra
// «Empezar el día» y genera los datos de ejemplo desde Ajustes. Solo datos de demo: el repo es público.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const [out = 'capturas', base = 'http://localhost:4173', lista = 'hoy,ajustes,plugin,dialogo,menu'] = process.argv.slice(2)
const PANTALLAS = lista.split(',')
const PORT = 9351
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
async function esperarSinAvisos() {
  for (let i = 0; i < 40 && (await p.eval(`!!document.querySelector('.z-toast [role=status], .z-toast [role=alert]')`)); i++) await sleep(250)
}
async function ir(ruta) {
  await p.goto(base + ruta)
  await sleep(900)
  await cerrarDialogos()
  await esperarSinAvisos()
}
const guardar = async (nombre, full) => {
  writeFileSync(join(out, `${nombre}.png`), await p.shot(full))
  console.log('·', nombre)
}

try {
  // Preparación: bienvenida fuera y datos de ejemplo.
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
  await esperarSinAvisos()

  for (const tema of ['light', 'dark']) {
    await p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: tema }] })
    const t = tema === 'light' ? 'claro' : 'oscuro'
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      await p.viewport(w, h, w < 768)
      const sufijo = `${t}-${w}`
      if (PANTALLAS.includes('hoy')) { await ir('/'); await guardar(`hoy-${sufijo}`, true) }
      if (PANTALLAS.includes('ajustes')) { await ir('/ajustes'); await guardar(`ajustes-${sufijo}`, true) }
      if (PANTALLAS.includes('plugin')) { await ir('/plugins/focus'); await guardar(`plugin-${sufijo}`, true) }
      if (PANTALLAS.includes('dialogo')) {
        await ir('/ajustes')
        await clickText('Borrar datos de ejemplo')
        await sleep(600)
        await guardar(`dialogo-${sufijo}`, false)
        await cerrarDialogos()
      }
      if (PANTALLAS.includes('menu')) {
        await ir('/')
        await p.eval(`document.querySelector('header [aria-haspopup=menu]')?.click()`)
        await sleep(500)
        await guardar(`menu-${sufijo}`, false)
        await p.key('Escape')
      }
      if (PANTALLAS.includes('celebracion')) {
        // Página de demo de Celebration (solo existe tras el 1a): `?nx-demo=celebration`.
        await ir('/ajustes?nx-demo=celebration')
        await guardar(`celebracion-${sufijo}`, false)
      }
    }
  }
  if (p.errors.length) console.log('Errores de consola:', p.errors)
} finally {
  p.close()
}
