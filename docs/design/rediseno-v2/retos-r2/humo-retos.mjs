// Humo por CDP de /retos (R2a). Solo datos de demo: perfil de Chrome nuevo, sin datos reales; el repo es público.
//
// Uso (con la app servida, p. ej. `npm run build && npx vite preview --port 4173`):
//   node docs/design/rediseno-v2/retos-r2/humo-retos.mjs [url-base]
//
// Sale con código 1 si alguna comprobación falla. Cubre: página, misiones, marcar con clic y con x,
// j/k, ficha, Hoy no y deshacer, pausar, crear desde la paleta, abandonar (confirmación sobre la ficha),
// eliminar y deshacer, g e, c y n, y que crear hábito, Borrar datos de ejemplo y Restaurar copia
// (otros Dialog) siguen atrapando el foco y devolviéndolo a su origen.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const base = process.argv[2] || 'http://localhost:4173'
const PORT = 9355
rmSync(join(tmpdir(), `nx-r2-${PORT}`), { recursive: true, force: true })
const p = await launch({ port: PORT })
const resultados = []
const ok = (nombre, cond, extra = '') => {
  resultados.push([nombre, !!cond])
  console.log(cond ? '  ok ' : '  FALLA', nombre, extra)
}

const tecla = async (key, { vk = 0, text, shift = false } = {}) => {
  const code = key.length === 1 ? `Key${key.toUpperCase()}` : key
  const modifiers = shift ? 8 : 0
  await p.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, text, modifiers, windowsVirtualKeyCode: vk })
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk })
}
const enter = () => tecla('Enter', { vk: 13, text: '\r' })
const tab = (shift = false) => tecla('Tab', { vk: 9, shift })
const letra = (c) => p.key(c)
const clickUltimo = (t) =>
  p.eval(`(() => { const bs = [...document.querySelectorAll('button')].filter(e => e.textContent.trim().includes(${JSON.stringify(t)}) && !e.disabled); const b = bs.at(-1); if (!b) return false; b.click(); return true })()`)
const filas = () => p.eval(`[...document.querySelectorAll('[data-challenge-row]')].map(e => e.textContent.trim())`)
const clickText = (t) =>
  p.eval(`(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim().includes(${JSON.stringify(t)}) && !e.disabled); if (!b) return false; b.click(); return true })()`)
const dialogos = () => p.eval(`document.querySelectorAll('[role=dialog]').length`)
const enDialogo = () => p.eval(`!!document.activeElement?.closest('[role=dialog]')`)
const activo = () => p.eval(`(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.getAttribute('data-challenge-row') && 'fila:' + a.textContent.trim() || a.textContent.trim().slice(0, 40) || a.tagName) : null })()`)
const ruta = () => p.eval('location.pathname')
const texto = () => p.eval('document.body.innerText')
async function ir(r, espera = 1200) {
  await p.goto(base + r)
  await sleep(espera)
  for (let i = 0; i < 4 && (await dialogos()); i++) {
    await p.key('Escape')
    await sleep(350)
  }
}
async function atrapado(n = 14) {
  for (let i = 0; i < n; i++) {
    await tab(i % 5 === 4)
    if (!(await enDialogo())) return false
  }
  return true
}
const abrirFila = (t) =>
  p.eval(`(() => { const b = [...document.querySelectorAll('[data-challenge-row]')].find(e => e.textContent.trim() === ${JSON.stringify(t)}); if (!b) return false; b.focus(); b.click(); return true })()`)
const menuItem = (t) =>
  p.eval(`(() => { const m = [...document.querySelectorAll('[role=menuitem]')].find(e => e.textContent.trim().startsWith(${JSON.stringify(t)})); if (!m) return false; m.click(); return true })()`)
const abrirMenu = () => p.eval(`(() => { const b = document.querySelector('[role=dialog] button[aria-label^="Más acciones"]'); if (!b) return false; b.click(); return true })()`)
const pulsado = (t) => p.eval(`document.querySelector('[data-challenge-id] button[aria-label="Marcar hoy: ${t}"]')?.getAttribute('aria-pressed')`)

async function demo() {
  await p.viewport(1440, 900)
  await p.goto(base + '/ajustes')
  await sleep(1500)
  await clickText('Saltar la bienvenida')
  await sleep(800)
  if (await clickText('Generar 6 meses de ejemplo')) {
    await sleep(400)
    await clickText('Confirmar')
    await sleep(2500)
  }
}

try {
  await demo()

  console.log('\n[1] Página, misiones y lista')
  await ir('/retos', 1800)
  const t1 = await texto()
  ok('h1 Retos y secciones', /Retos\n/.test(t1) && t1.includes('Misiones de hoy') && t1.includes('Retos propios') && t1.includes('Terminados'))
  ok('misiones de hoy con +XP', /\+\d+ XP/.test(t1))
  ok('pista de atajos «c nuevo reto»', t1.includes('nuevo reto') && t1.includes('marcar hoy'))

  console.log('\n[2] Marcar con clic (celebra) y con x (j para enfocar)')
  ok('Leer 20 minutos sin marcar', (await pulsado('Leer 20 minutos')) === 'false')
  await p.click('[data-challenge-id] button[aria-label="Marcar hoy: Leer 20 minutos"]')
  await sleep(250)
  ok('celebración al marcar', await p.eval(`!!document.querySelector('[data-celebration]')`))
  await sleep(1500)
  ok('marcado (aria-pressed)', (await pulsado('Leer 20 minutos')) === 'true')
  await letra('j')
  await sleep(150)
  ok('j enfoca la primera fila', (await activo()) === 'fila:Leer 20 minutos', await activo())
  await letra('x')
  await sleep(400)
  ok('x desmarca (sin celebrar)', (await pulsado('Leer 20 minutos')) === 'false' && !(await p.eval(`!!document.querySelector('[data-celebration]')`)))
  await letra('x')
  await sleep(400)
  ok('x vuelve a marcar', (await pulsado('Leer 20 minutos')) === 'true')
  await letra('x')
  await sleep(400)

  console.log('\n[3] Ficha con Enter, «Hoy no» y deshacer, foco al cerrar')
  await letra('j') // cursor ya en la 1ª: se queda; enfocar explícito
  await p.eval(`document.querySelector('[data-challenge-row]').focus()`)
  await enter()
  await sleep(700)
  ok('Enter abre la ficha (1 diálogo)', (await dialogos()) === 1 && (await ruta()).startsWith('/retos/'), await ruta())
  ok('foco dentro de la ficha', await enDialogo())
  ok('ficha atrapa el foco con Tab', await atrapado())
  ok('«Hoy no» disponible', await clickText('Hoy no · gasta'))
  await sleep(500)
  ok('«Hoy no» aplicado', (await texto()).includes('Quitar «Hoy no»'))
  ok('«Deshacer» del aviso', await clickUltimo('Deshacer'))
  await sleep(600)
  ok('escudo devuelto', (await texto()).includes('Hoy no · gasta'))
  await p.key('Escape')
  await sleep(600)
  ok('Esc cierra la ficha y vuelve a /retos', (await dialogos()) === 0 && (await ruta()) === '/retos')
  ok('foco vuelve a la fila', (await activo()) === 'fila:Leer 20 minutos', await activo())

  console.log('\n[4] Pausar y reanudar')
  ok('abre «Sin azúcar añadido»', await abrirFila('Sin azúcar añadido'))
  await sleep(700)
  await abrirMenu()
  await sleep(300)
  ok('Pausar desde mañana', await menuItem('Pausar desde mañana'))
  await sleep(600)
  await abrirMenu()
  await sleep(300)
  ok('ahora ofrece Reanudar', await p.eval(`[...document.querySelectorAll('[role=menuitem]')].some(e => e.textContent.trim().startsWith('Reanudar'))`))
  ok('Reanudar', await menuItem('Reanudar'))
  await sleep(500)
  await p.key('Escape')
  await sleep(500)

  console.log('\n[5] Crear desde la paleta y avisar con «Ver»')
  await p.key('k', { ctrl: true })
  await sleep(500)
  await p.type('Nuevo reto')
  await sleep(500)
  await enter()
  await sleep(900)
  ok('abre «Nuevo reto propio»', (await texto()).includes('Nuevo reto propio'))
  ok('foco en el campo', (await p.eval(`document.activeElement?.tagName`)) === 'INPUT')
  await p.type('Prueba de humo 7 días 1 escudo')
  await sleep(300)
  ok('Crear desactivado sin nombre se comprueba en tests; aquí, activo', await p.eval(`!document.evaluate("//button[starts-with(normalize-space(.), 'Crear reto')]", document, null, 9, null).singleNodeValue?.disabled`))
  await enter()
  await sleep(1100)
  const nd = await dialogos()
  const tcr = await texto()
  ok('formulario cerrado', nd === 0, String(nd))
  ok('aviso «Reto creado»', tcr.includes('Reto creado'))
  ok('Ver abre la ficha', await clickText('Ver'))
  await sleep(800)
  ok('ruta /retos/:id y título', /^\/retos\/\d+$/.test(await ruta()) && (await texto()).includes('Prueba de humo'))

  console.log('\n[6] Abandonar con confirmación (diálogo encima de la ficha)')
  await abrirMenu()
  await sleep(300)
  ok('Abandonar…', await menuItem('Abandonar'))
  await sleep(700)
  ok('2 diálogos (ficha + confirmación)', (await dialogos()) === 2, String(await dialogos()))
  const encima = await p.eval(`(() => { const d = [...document.querySelectorAll('[role=dialog]')].find(x => x.textContent.includes('¿Abandonar')); if (!d) return null; const r = d.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return !!e?.closest('[role=dialog]') && e.closest('[role=dialog]').textContent.includes('¿Abandonar') })()`)
  ok('la confirmación está por encima (z-order)', encima === true, String(encima))
  ok('foco atrapado en la confirmación', await atrapado(8))
  await p.key('Escape')
  await sleep(500)
  ok('Esc cierra solo la confirmación', (await dialogos()) === 1)
  ok('foco devuelto al menú «Más acciones»', (await activo()).startsWith('Más acciones'), await activo())
  await abrirMenu()
  await sleep(300)
  await menuItem('Abandonar')
  await sleep(700)
  ok('confirmar abandono', await p.eval(`(() => { const d = [...document.querySelectorAll('[role=dialog]')].find(x => x.textContent.includes('¿Abandonar')); const b = [...d.querySelectorAll('button')].find(e => e.textContent.trim() === 'Abandonar'); b.click(); return true })()`))
  await sleep(800)
  ok('aviso «Reto abandonado»', (await texto()).includes('Reto abandonado'))

  console.log('\n[7] Eliminar sin confirmar y deshacer')
  await abrirMenu()
  await sleep(300)
  ok('Eliminar', await menuItem('Eliminar'))
  await sleep(800)
  ok('sin diálogo de confirmación y ficha cerrada', (await dialogos()) === 0 && (await ruta()) === '/retos')
  ok('ya no está en la lista', !(await filas()).includes('Prueba de humo'))
  ok('«Deshacer»', await clickUltimo('Deshacer'))
  await sleep(900)
  ok('vuelve (en Terminados, abandonado)', (await filas()).includes('Prueba de humo'))

  console.log('\n[8] g e')
  await ir('/')
  await letra('g')
  await letra('e')
  await sleep(800)
  ok('g e va a /retos', (await ruta()) === '/retos', await ruta())
  await letra('c')
  await sleep(700)
  ok('c abre el formulario de reto', (await texto()).includes('Nuevo reto propio'))
  await p.key('Escape')
  await sleep(500)
  await letra('n')
  await sleep(600)
  ok('n sigue siendo tarea (no abre reto)', !(await texto()).includes('Nuevo reto propio'))
  await p.key('Escape')
  await sleep(400)

  console.log('\n[9] Otros Dialog con teclado: foco atrapado y devuelto (useModalFocus)')
  // a) Crear hábito
  await ir('/habitos')
  const abridor = await p.eval(`(() => { const b = [...document.querySelectorAll('main button')].find(e => /hábito/i.test(e.textContent)); if (!b) return null; b.focus(); return b.textContent.trim().slice(0, 40) })()`)
  ok('hay un botón de crear hábito', abridor !== null, String(abridor))
  await letra('c')
  await sleep(700)
  ok('crear hábito: abre y enfoca dentro', (await dialogos()) === 1 && (await enDialogo()))
  ok('crear hábito: foco atrapado', await atrapado())
  await p.key('Escape')
  await sleep(600)
  ok('crear hábito: cierra y el foco vuelve al origen', (await dialogos()) === 0 && (await activo()) === abridor, `${await activo()} / ${abridor}`)

  // b) Ajustes: borrar datos de ejemplo
  await ir('/ajustes', 1500)
  await p.eval(`[...document.querySelectorAll('button')].find(e => e.textContent.includes('Borrar datos de ejemplo')).focus()`)
  await enter()
  await sleep(700)
  ok('ajustes (datos de ejemplo): abre y enfoca dentro', (await dialogos()) === 1 && (await enDialogo()))
  ok('ajustes (datos de ejemplo): foco atrapado', await atrapado())
  await p.key('Escape')
  await sleep(600)
  ok('ajustes (datos de ejemplo): foco vuelve', (await dialogos()) === 0 && (await activo()).includes('Borrar datos de ejemplo'), await activo())

  // c) Restaurar copia
  const copia = join(tmpdir(), 'nx-r2-copia-humo.json')
  writeFileSync(copia, '{}')
  await p.eval(`[...document.querySelectorAll('button')].find(e => e.textContent.includes('Restaurar desde archivo')).focus()`)
  const { root } = await p.send('DOM.getDocument', {})
  const { nodeId } = await p.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type=file][accept="application/json"]' })
  await p.send('DOM.setFileInputFiles', { files: [copia], nodeId })
  await sleep(800)
  ok('restaurar copia: abre y enfoca dentro', (await dialogos()) === 1 && (await enDialogo()))
  ok('restaurar copia: foco atrapado', await atrapado())
  await p.key('Escape')
  await sleep(600)
  ok('restaurar copia: cierra y el foco vuelve', (await dialogos()) === 0 && (await activo()).includes('Restaurar desde archivo'), await activo())

  console.log('\n[10] Gamificación apagada y plugin apagado')
  const fijar = (id, on) =>
    p.eval(`(async () => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('nexus'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
      const tx = db.transaction('settings', 'readwrite'); const st = tx.objectStore('settings')
      const row = await new Promise((res) => { const r = st.get(1); r.onsuccess = () => res(r.result) })
      st.put({ ...row, plugins: { ...(row?.plugins ?? {}), ${JSON.stringify(id)}: ${on} } })
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) }); db.close(); return true })()`)
  await fijar('gamification', false)
  await ir('/retos', 1800)
  const sinXp = await texto()
  ok('sin gamificación: ni +XP ni Recompensa', !/\+\d+ XP/.test(sinXp))
  await abrirFila('Leer 20 minutos')
  await sleep(700)
  ok('sin gamificación: la ficha no tiene Recompensa', !(await texto()).includes('Recompensa'))
  await p.key('Escape')
  await sleep(500)
  await fijar('gamification', true)
  await fijar('challenges', false)
  await ir('/retos', 1200)
  const sinPlugin = await texto()
  ok('plugin apagado: PluginGate pide activarlo', /Activar|apagado|desactivado/i.test(sinPlugin), sinPlugin.slice(0, 120).replace(/\n/g, ' | '))
  ok('plugin apagado: Retos desaparece de la navegación', await p.eval(`![...document.querySelectorAll('nav a, aside a')].some(a => a.textContent.trim().startsWith('Retos'))`))
  await fijar('challenges', true)

  console.log('\n[10b] Borrar datos de ejemplo limpia también las misiones de hoy')
  await ir('/ajustes', 1500)
  await clickText('Borrar datos de ejemplo')
  await sleep(500)
  await p.eval(`(() => { const d = document.querySelector('[role=dialog]'); const b = [...d.querySelectorAll('button')].find(e => /Borrar|Confirmar/.test(e.textContent) && !/Cancelar/.test(e.textContent)); b?.click() })()`)
  await sleep(2500)
  await ir('/retos', 1800)
  const trasBorrar = await texto()
  const filasTrasBorrar = await filas()
  ok('sin retos de la demo (las plantillas del vacío no cuentan)', !filasTrasBorrar.includes('Leer 20 minutos') && !filasTrasBorrar.includes('Meditar 10 minutos'), filasTrasBorrar.join(' | '))
  ok('las misiones de hoy de la demo ya no están (el motor las regenera con datos reales o ninguna)', !/Cumple tus 4 hábitos de hoy/.test(trasBorrar))

  console.log('\n[11] Resto de la app intacto')
  await ir('/', 1500)
  ok('Hoy carga', (await texto()).length > 200)
  await ir('/plugins/virtualization', 1200)
  ok('Virtualización (plugin) carga', (await texto()).includes('Virtualización'))
  await ir('/planificacion', 1200)
  ok('Planificación carga', (await texto()).length > 200)

  console.log('\nErrores de consola:', p.errors.length ? p.errors : 'ninguno')
  const fallos = resultados.filter(([, c]) => !c)
  console.log(`\n${resultados.length - fallos.length}/${resultados.length} ok`, fallos.length ? `\nFALLAN: ${fallos.map((f) => f[0]).join(' · ')}` : '')
  if (fallos.length) process.exitCode = 1
} finally {
  p.close()
}
