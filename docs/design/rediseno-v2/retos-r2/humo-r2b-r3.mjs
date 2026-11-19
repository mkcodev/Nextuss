// Humo por CDP de R2b + R3: vistas Cadena y Horizonte, selector, celda «Retos» en Hoy, cierre del reto al
// marcar su último día, aviso «Reto cumplido» y logros. Solo datos de demo: perfil de Chrome nuevo, sin
// datos reales; el repo es público.
//
// Uso (con la app servida, p. ej. `npm run build && npx vite preview --port 4173`):
//   node docs/design/rediseno-v2/retos-r2/humo-r2b-r3.mjs [url-base]
//
// Sale con código 1 si alguna comprobación falla.
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const base = process.argv[2] || 'http://localhost:4173'
const PORT = 9356
rmSync(join(tmpdir(), `nx-r2-${PORT}`), { recursive: true, force: true })
const p = await launch({ port: PORT })
const resultados = []
const ok = (nombre, cond, extra = '') => {
  resultados.push([nombre, !!cond])
  console.log(cond ? '  ok ' : '  FALLA', nombre, extra)
}

const VK = { ArrowRight: 39, ArrowLeft: 37, End: 35, Home: 36, Enter: 13, Escape: 27, Tab: 9 }
const tecla = async (key, { ctrl = false } = {}) => {
  const code = key.length === 1 ? `Key${key.toUpperCase()}` : key
  const modifiers = ctrl ? 2 : 0
  const text = key === 'Enter' ? String.fromCharCode(13) : key.length === 1 && !ctrl ? key : undefined
  const vk = VK[key] ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0)
  await p.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, text, modifiers, windowsVirtualKeyCode: vk })
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk })
}
const clickText = (t) =>
  p.eval(`(() => { const b = [...document.querySelectorAll('button')].find(e => e.textContent.trim().includes(${JSON.stringify(t)}) && !e.disabled); if (!b) return false; b.click(); return true })()`)
const texto = () => p.eval('document.body.innerText')
const dialogos = () => p.eval(`document.querySelectorAll('[role=dialog]').length`)
const pulsado = (t) => p.eval(`document.querySelector('[data-challenge-id] button[aria-label="Marcar hoy: ${t}"]')?.getAttribute('aria-pressed')`)
const radios = () => p.eval(`[...document.querySelectorAll('[role=radiogroup][aria-label="Vista de los retos propios"] [role=radio]')].map(r => r.textContent.trim() + ':' + r.getAttribute('aria-checked'))`)
const activo = () => p.eval(`(() => { const a = document.activeElement; return a ? (a.getAttribute('role') === 'radio' ? 'radio:' + a.textContent.trim() : a.getAttribute('data-challenge-row') ? 'fila:' + a.textContent.trim() : a.tagName) : null })()`)
const scrollH = () => p.eval(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
const vista = (nombre) => p.eval(`(() => { const r = [...document.querySelectorAll('[role=radiogroup][aria-label="Vista de los retos propios"] [role=radio]')].find(e => e.textContent.trim() === ${JSON.stringify(nombre)}); if (!r) return false; r.click(); return true })()`)
const centrar = (sel) => p.eval(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({ block: 'center' })`)
const avisos = () => p.eval(`[...document.querySelectorAll('.z-toast [role=status], .z-toast [role=alert]')].map(e => e.textContent.trim())`)

async function ir(r, espera = 1200) {
  await p.goto(base + r)
  await sleep(espera)
  for (let i = 0; i < 4 && (await dialogos()); i++) {
    await p.key('Escape')
    await sleep(350)
  }
}

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

  console.log('\n[1] Selector: radiogroup con flechas, foco en la opción')
  await ir('/retos', 1800)
  ok('3 opciones y Mezcla por defecto', JSON.stringify(await radios()) === JSON.stringify(['Mezcla:true', 'Cadena:false', 'Horizonte:false']), JSON.stringify(await radios()))
  await p.eval(`document.querySelector('[role=radio][aria-checked=true]').focus()`)
  await tecla('ArrowRight')
  await sleep(300)
  ok('flecha derecha: Cadena y el foco se queda en la opción', (await radios())[1] === 'Cadena:true' && (await activo()) === 'radio:Cadena', await activo())
  ok('Cadena pinta una imagen con el recuento de la cadena', await p.eval(`!!document.querySelector('[role=img][aria-label^="Cadena de "]')`))
  await tecla('ArrowRight')
  await sleep(300)
  ok('flecha derecha: Horizonte con su leyenda', (await radios())[2] === 'Horizonte:true' && (await texto()).includes('Escudo') && (await p.eval(`!!document.querySelector('[aria-label="Leyenda del horizonte"]')`)))
  await tecla('ArrowRight')
  await sleep(300)
  ok('flecha derecha da la vuelta a Mezcla', (await radios())[0] === 'Mezcla:true')
  await tecla('End')
  await sleep(300)
  ok('Fin salta a Horizonte', (await radios())[2] === 'Horizonte:true')
  await ir('/retos', 1500)
  ok('la vista se recuerda tras recargar', (await radios())[2] === 'Horizonte:true', JSON.stringify(await radios()))
  ok('no hay elementos arrastrables en la página', !(await p.eval(`!!document.querySelector('main [draggable=true]')`)))

  console.log('\n[2] Las tres vistas: j/k, x, Enter, foco al cerrar la ficha')
  for (const nombre of ['Mezcla', 'Cadena', 'Horizonte']) {
    await ir('/retos', 1300) // recarga: el cursor de j/k vuelve a empezar
    await vista(nombre)
    await sleep(500)
    await p.eval(`document.activeElement?.blur?.()`)
    await tecla('j')
    await sleep(200)
    const primera = await p.eval(`document.querySelector('[data-challenge-row]')?.textContent.trim()`)
    ok(`[${nombre}] j enfoca la primera fila`, (await activo()) === `fila:${primera}`, await activo())
    const antes = await pulsado(primera)
    await tecla('x')
    await sleep(500)
    const despues = await pulsado(primera)
    ok(`[${nombre}] x cambia el estado de hoy`, antes !== null && antes !== despues, `${antes} -> ${despues}`)
    await tecla('x')
    await sleep(500)
    await tecla('Enter')
    await sleep(700)
    ok(`[${nombre}] Enter abre la ficha`, (await dialogos()) === 1)
    await p.key('Escape')
    await sleep(500)
    ok(`[${nombre}] Esc devuelve el foco a la fila`, (await activo()) === `fila:${primera}`, await activo())
  }

  console.log('\n[3] 375 px: sin scroll horizontal y selector con zona de toque de 44 px')
  await p.viewport(375, 812, true)
  for (const nombre of ['Mezcla', 'Cadena', 'Horizonte']) {
    await ir('/retos', 1200)
    await vista(nombre)
    await sleep(500)
    ok(`[${nombre}] sin scroll horizontal a 375`, !(await scrollH()))
  }
  const alto = await p.eval(`document.querySelector('[role=radiogroup][aria-label="Vista de los retos propios"] [role=radio]').getBoundingClientRect().height`)
  ok('selector ≥ 44 px de alto a 375', alto >= 44, `${alto}px`)
  await p.viewport(1440, 900)

  console.log('\n[4] Hoy: celda «Retos»')
  await ir('/', 1800)
  const hoy = await texto()
  ok('celda Retos con misiones y retos por marcar', /Retos/.test(hoy) && /misiones hoy · \d+ retos? por marcar/.test(hoy), hoy.match(/misiones hoy[^\n]*/)?.[0])
  ok('enlace a /retos', await p.eval(`!!document.querySelector('section a[href="/retos"]')`))
  const primero = await p.eval(`document.querySelector('section [data-challenge-id] button[aria-label^="Marcar hoy: "]')?.getAttribute('aria-label')?.replace('Marcar hoy: ', '')`)
  ok('hay un reto marcable en Hoy', !!primero, primero)
  const estado0 = await p.eval(`document.querySelector('section [data-challenge-id] button[aria-label="Marcar hoy: ${primero}"]')?.getAttribute('aria-pressed')`)
  await centrar(`section [data-challenge-id] button[aria-label="Marcar hoy: ${primero}"]`)
  await sleep(300)
  await p.click(`section [data-challenge-id] button[aria-label="Marcar hoy: ${primero}"]`)
  await sleep(300)
  ok('marcar desde Hoy celebra', await p.eval(`!!document.querySelector('[data-celebration]')`))
  await sleep(1200)
  const estado1 = await p.eval(`document.querySelector('section [data-challenge-id] button[aria-label="Marcar hoy: ${primero}"]')?.getAttribute('aria-pressed')`)
  ok('el reto cambia de estado en Hoy', estado0 !== estado1, `${estado0} -> ${estado1}`)
  await centrar(`section [data-challenge-id] button[aria-label="Marcar hoy: ${primero}"]`)
  await p.click(`section [data-challenge-id] button[aria-label="Marcar hoy: ${primero}"]`)
  await sleep(500)
  ok('quitar la marca no celebra', !(await p.eval(`!!document.querySelector('[data-celebration]')`)))
  await p.viewport(375, 812, true)
  await ir('/', 1500)
  ok('Hoy sin scroll horizontal a 375', !(await scrollH()))
  const medidas = await p.eval(`JSON.stringify([...document.querySelectorAll('section a[href="/retos"]'), ...document.querySelectorAll('section [data-challenge-id] button[aria-label^="Marcar hoy: "]')].map((e) => Math.round(e.getBoundingClientRect().height)))`)
  ok('enlace y marcas de la celda de Hoy ≥ 44 px a 375', JSON.parse(medidas).length > 0 && JSON.parse(medidas).every((h) => h >= 44), medidas)
  await p.viewport(1440, 900)

  console.log('\n[5] Cerrar el reto al marcar el último día')
  await ir('/retos', 1500)
  await tecla('c')
  await sleep(600)
  await p.type('Beber agua 1 día 0 escudos')
  await sleep(400)
  await clickText('Crear reto')
  await sleep(1200)
  ok('el reto de un día aparece en marcha', (await pulsado('Beber agua')) === 'false')
  await p.eval(`document.activeElement?.blur?.()`)
  await p.eval(`document.querySelector('[data-challenge-row]').focus()`)
  const filas = await p.eval(`[...document.querySelectorAll('[data-challenge-row]')].map(e => e.textContent.trim())`)
  const idx = filas.indexOf('Beber agua')
  await p.eval(`[...document.querySelectorAll('[data-challenge-row]')].find(e => e.textContent.trim() === 'Beber agua').focus()`)
  await tecla('x')
  await sleep(500)
  ok('celebra al cerrar', await p.eval(`!!document.querySelector('[data-celebration]')`), `fila ${idx}`)
  await sleep(1200)
  const seccion = await p.eval(`(() => { const h = [...document.querySelectorAll('h2')].find(e => e.textContent.trim() === 'Terminados'); return h ? h.closest('section').innerText : '' })()`)
  ok('«Beber agua» pasa a Terminados en el momento', seccion.includes('Beber agua') && seccion.includes('Perfecto'), seccion.replace(/\n/g, ' | '))
  const av = await avisos()
  ok('aviso «Reto cumplido» con Deshacer', av.some((a) => a.includes('Reto cumplido') && a.includes('Deshacer')), JSON.stringify(av))
  ok('aviso del logro «Cadena completa»', av.some((a) => a.includes('Cadena completa')))
  await clickText('Deshacer')
  await sleep(1200)
  ok('Deshacer reabre el reto', (await pulsado('Beber agua')) === 'false')
  await p.eval(`[...document.querySelectorAll('[data-challenge-row]')].find(e => e.textContent.trim() === 'Beber agua').focus()`)
  await tecla('x')
  await sleep(1500)
  await ir('/', 1800)
  const hoy2 = await p.eval(`(() => { const s = document.querySelector('section[aria-labelledby] a[href="/retos"]')?.closest('section'); return s ? s.innerText : '' })()`)
  ok('en Hoy el reto cerrado se queda como «cumplido»', hoy2.includes('Beber agua') && hoy2.includes('cumplido'), hoy2.replace(/\n/g, ' | ').slice(0, 200))

  console.log('\n[6] Resto de la app intacto')
  await ir('/plugins/virtualization', 1200)
  ok('Virtualización (plugin) carga', (await texto()).includes('Virtualización'))
  await ir('/planificacion', 1200)
  ok('Planificación carga', (await texto()).length > 200)
  await ir('/ajustes', 1200)
  ok('Ajustes carga y enseña Logros', (await texto()).length > 200)

  console.log('\nErrores de consola:', p.errors.length ? p.errors : 'ninguno')
  ok('consola limpia', p.errors.length === 0)
  const fallos = resultados.filter(([, c]) => !c)
  console.log(`\n${resultados.length - fallos.length}/${resultados.length} ok`, fallos.length ? `\nFALLAN: ${fallos.map((f) => f[0]).join(' · ')}` : '')
  if (fallos.length) process.exitCode = 1
} finally {
  p.close()
}
