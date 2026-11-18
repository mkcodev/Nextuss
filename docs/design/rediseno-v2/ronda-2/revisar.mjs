// Revisión rápida durante la construcción: abre una dirección, recorre las capas y guarda
// capturas de cada estado en OUT (por defecto, la carpeta temporal). Informa de errores de consola.
// Uso: node revisar.mjs <direccion> [light|dark] [ancho]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { launch, sleep } from './cdp.mjs'

const [dir = 'linea', theme = 'dark', width = '1440'] = process.argv.slice(2)
const OUT = process.env.OUT || join(tmpdir(), 'nx-revisar')
mkdirSync(OUT, { recursive: true })
const base = `http://localhost:5174/direcciones/${dir}/?theme=${theme}`
const p = await launch()
const w = +width
await p.viewport(w, w < 768 ? 812 : 900, w < 768)
const save = async (name) => writeFileSync(join(OUT, `${dir}-${theme}-${w}-${name}.png`), await p.shot())
await p.goto(base)
await sleep(1200)
await save('0-hoy')
await p.click('.rows-plan .row.is-cursor .status-btn')
await sleep(250)
await save('1-completando')
await sleep(900)
await save('2-completada')
await p.key('k', { ctrl: true })
await sleep(500)
await save('3-paleta')
await p.type('foc', 60)
await sleep(400)
await save('4-paleta-filtro')
await p.key('Escape')
await sleep(400)
await p.key('i')
await sleep(500)
await p.type('Revisar el contrato del local mañana 10:00 p2 #trabajo 30 min ', 15)
await sleep(500)
await save('5-captura')
await p.key('Enter')
await sleep(900)
await save('6-creada')
await p.key('f')
await sleep(900)
await save('7-foco')
await p.key('Escape')
await sleep(800)
await p.key('t')
await sleep(250)
await save('8-tema-medio')
await sleep(900)
await save('9-tema')
console.log(p.errors.length ? `ERRORES:\n${p.errors.join('\n')}` : 'Sin errores de consola')
console.log(OUT)
p.close()
