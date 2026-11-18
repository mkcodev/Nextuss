// Tabla de contraste WCAG por dirección, a partir de sus tokens reales (sin dependencias).
// Uso: node contraste.mjs   ->  escribe direcciones/<dir>/contraste.md y sale con código 1 si algo falla.
// Umbrales: texto 4,5:1 (AA texto normal), ui 3:1 (componentes y texto grande), decorativo: solo informa.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const MIN = { texto: 4.5, ui: 3, decorativo: 0 }

const hex = (h) => {
  const s = h.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
// color-mix(in srgb, A p%, B): mezcla lineal en sRGB, igual que el navegador.
const resolve = (theme, name, seen = new Set()) => {
  const v = theme[name]
  if (v === undefined) throw new Error(`token sin definir: ${name}`)
  if (typeof v === 'string') return hex(v)
  if (seen.has(name)) throw new Error(`ciclo en ${name}`)
  seen.add(name)
  const [a, p, b] = v.mix
  const A = resolve(theme, a, seen)
  const B = resolve(theme, b, seen)
  return A.map((x, i) => x * p + B[i] * (1 - p))
}

let fails = 0
const resumen = []
for (const dir of readdirSync(join(here, 'direcciones'))) {
  const t = JSON.parse(readFileSync(join(here, 'direcciones', dir, 'tokens.json'), 'utf8'))
  const rows = []
  for (const [mode, label] of [
    ['light', 'Claro'],
    ['dark', 'Oscuro'],
  ]) {
    for (const [fg, bg, kind] of t.pares) {
      const F = resolve(t.color[mode], fg)
      const B = resolve(t.color[mode], bg)
      const r = ratio(F, B)
      const ok = r >= MIN[kind]
      if (!ok) fails++
      rows.push(`| ${label} | \`${fg}\` ${toHex(F)} | \`${bg}\` ${toHex(B)} | ${kind} | ${r.toFixed(2)}:1 | ${kind === 'decorativo' ? 'informativo' : ok ? 'pasa' : '**FALLA**'} |`)
    }
  }
  const bad = rows.filter((r) => r.includes('FALLA')).length
  resumen.push(`${t.nombre}: ${rows.length} pares, ${bad} fallos`)
  const md = `# Contraste: ${t.nombre}

Generado con \`node contraste.mjs\` a partir de \`tokens.json\`. Umbrales WCAG 2.2 AA: texto normal 4,5:1;
texto grande y componentes de interfaz 3:1. Los pares «decorativo» acompañan siempre a texto o forma
(nunca llevan información solos) y se listan solo como referencia.

| Tema | Primer plano | Fondo | Uso | Contraste | Resultado |
|---|---|---|---|---|---|
${rows.join('\n')}
`
  writeFileSync(join(here, 'direcciones', dir, 'contraste.md'), md)
}
console.log(resumen.join('\n'))
process.exit(fails ? 1 : 0)
