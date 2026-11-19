// Retos R0 · capturas fijas (sin animación: ?static=1, sin la barra del mockup: ?bare=1) de las cuatro
// vistas (d Mezcla, b Cadena, c Horizonte), en sus 6 estados, en claro y oscuro, a 1440 y
// 375. Comprueba de paso que no haya errores de consola, scroll horizontal ni iconos sin resolver.
// Los estados «vacio» y «hoy» son comunes a las cuatro vistas (no llevan lista), así que solo se
// capturan una vez, con d. Con --todo se capturan también con las demás.
// Requiere el servidor local en el puerto 5174, sirviendo la carpeta del rediseño:
//   npx serve -l 5174 docs/design/rediseno-v2
// Uso: node capturar.mjs [d|b|c ...] [--vista=lista,hoy] [--todo]
// Salida: capturas/<v>-<vista>-<claro|oscuro>-<1440|375>.png
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, sleep } from '../ronda-2/cdp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1]
const variantes = args.filter((a) => !a.startsWith('--')).length ? args.filter((a) => !a.startsWith('--')) : ['d', 'b', 'c']
const vistas = flag('vista') ? flag('vista').split(',') : ['lista', 'detalle', 'crear', 'vacio', 'completar', 'hoy']
const COMUNES = new Set(['vacio', 'hoy'])
const todo = args.includes('--todo')
const BASE = process.env.BASE || 'http://localhost:5174/retos-r0/'
const out = join(here, 'capturas')
mkdirSync(out, { recursive: true })

const p = await launch({ port: 9371 })
const problemas = []
for (const v of variantes)
  for (const vista of vistas)
    for (const [theme, tname] of [['light', 'claro'], ['dark', 'oscuro']])
      for (const [w, h] of [[1440, 900], [375, 812]]) {
        const file = `${v}-${vista}-${tname}-${w}.png`
        if (COMUNES.has(vista) && v !== 'd' && !todo) continue
        const errAntes = p.errors.length
        await p.viewport(w, h, w < 768)
        await p.goto(`${BASE}?v=${v}&vista=${vista}&theme=${theme}&static=1&bare=1`)
        await sleep(250)
        const chk = await p.eval(`({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          iconos: document.querySelectorAll('i[data-lucide]').length,
          capa: !!document.querySelector('.scrim'),
          alto: Math.ceil(document.documentElement.scrollHeight),
        })`)
        if (chk.overflow) problemas.push(`${file}: scroll horizontal`)
        if (chk.iconos) problemas.push(`${file}: ${chk.iconos} iconos sin resolver`)
        if (p.errors.length > errAntes) problemas.push(`${file}: ${p.errors.slice(errAntes).join(' | ')}`)
        // Sin capa encima: página entera (el viewport crece para que la barra lateral y el panel, de 100vh, la cubran).
        // Con diálogo, ficha u hoja: solo el viewport, como se vería.
        if (!chk.capa && chk.alto > h) {
          await p.viewport(w, chk.alto, w < 768)
          await sleep(150)
        }
        writeFileSync(join(out, file), await p.shot(false))
        console.log(file)
      }
console.log(problemas.length ? `PROBLEMAS:\n${problemas.join('\n')}` : 'Sin problemas: ni errores, ni scroll horizontal, ni iconos sin resolver.')
p.close()
