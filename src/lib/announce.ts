/** Anuncia un mensaje a lectores de pantalla (región `aria-live` oculta, creada una sola vez). Para
 *  cambios que no se ven como un foco nuevo: reordenar con teclado, acciones en bloque… */
let region: HTMLElement | null = null

export function announce(message: string): void {
  if (typeof document === 'undefined') return
  if (!region) {
    region = document.createElement('div')
    region.setAttribute('aria-live', 'polite')
    region.setAttribute('role', 'status')
    Object.assign(region.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
    })
    document.body.appendChild(region)
  }
  // Vaciar y reescribir en el siguiente tick: así se vuelve a anunciar aunque el texto se repita.
  region.textContent = ''
  const el = region
  setTimeout(() => {
    el.textContent = message
  }, 50)
}
