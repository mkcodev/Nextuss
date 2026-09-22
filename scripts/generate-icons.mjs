#!/usr/bin/env node
// Genera los iconos de la PWA a partir de public/icon.svg. `npm run icons`.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcSvg = join(root, 'public', 'icon.svg')
const outDir = join(root, 'public')

const THEME_BG = { r: 0x0b, g: 0x0e, b: 0x14, alpha: 1 }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * Renderiza el SVG a PNG cuadrado de `size`px. Con `scale < 1`, el logo se encoge a ese
 * porcentaje del lienzo y se centra sobre `background` — la "zona segura" que piden los iconos
 * maskable (el sistema puede recortar hasta el 20% del borde para aplicar su propia forma).
 */
async function renderPng(size, { background = TRANSPARENT, scale = 1 } = {}) {
  const inner = Math.round(size * scale)
  const logo = await sharp(srcSvg)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()

  if (scale === 1 && background === TRANSPARENT) {
    return logo
  }

  const offset = Math.round((size - inner) / 2)
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toBuffer()
}

async function main() {
  await mkdir(outDir, { recursive: true })

  await writeFile(join(outDir, 'pwa-192.png'), await renderPng(192))
  await writeFile(join(outDir, 'pwa-512.png'), await renderPng(512))

  // Maskable: fondo sólido de marca (nunca transparente) + arte en el 80% central.
  await writeFile(join(outDir, 'maskable-512.png'), await renderPng(512, { background: THEME_BG, scale: 0.8 }))

  // iOS tampoco respeta bien la transparencia en el icono de inicio.
  await writeFile(
    join(outDir, 'apple-touch-icon-180.png'),
    await renderPng(180, { background: THEME_BG, scale: 0.82 }),
  )

  const faviconSource = await renderPng(256, { background: THEME_BG })
  const ico = await pngToIco(faviconSource)
  await writeFile(join(outDir, 'favicon.ico'), ico)

  console.log('Iconos generados en public/: pwa-192.png, pwa-512.png, maskable-512.png, apple-touch-icon-180.png, favicon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
