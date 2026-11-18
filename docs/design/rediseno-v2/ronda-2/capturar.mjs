// Capturas fijas de página completa (sin animación: ?static=1) de cada dirección de la ronda 2,
// en claro y oscuro, a 1440 y 375. Requiere el servidor local en el puerto 5174:
//   npx serve -l 5174 docs/design/rediseno-v2/ronda-2
// Uso: node capturar.mjs [direccion...]   ·   Salida: capturas/<direccion>-<claro|oscuro>-<1440|375>.png
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, sleep } from './cdp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(here, 'direcciones'))
const out = join(here, 'capturas')
mkdirSync(out, { recursive: true })
const p = await launch({ port: 9360 })
for (const dir of dirs)
  for (const [theme, tname] of [['light', 'claro'], ['dark', 'oscuro']])
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      await p.viewport(w, h, w < 768)
      await p.goto(`http://localhost:5174/direcciones/${dir}/?static=1&theme=${theme}`)
      await sleep(400)
      const file = `${dir}-${tname}-${w}.png`
      writeFileSync(join(out, file), await p.shot(true))
      console.log(file)
    }
if (p.errors.length) console.log(`ERRORES:\n${p.errors.join('\n')}`)
p.close()
