import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** Modales abiertos, del más antiguo al más reciente. Solo el último atrapa el foco y atiende Esc:
 *  así un diálogo de confirmación abierto sobre una hoja no pelea con ella por el foco. */
const stack: symbol[] = []

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

interface ModalFocusOptions {
  /** Esc dentro del modal (si nadie de dentro lo ha gestionado ya). El hook ya detiene la propagación. */
  onEscape: () => void
  /** Dónde devolver el foco al cerrar si el elemento que lo tenía al abrir ya no está (o era `<body>`,
   *  como al entrar por un enlace directo). */
  returnFocusTo?: () => HTMLElement | null
}

/**
 * Comportamiento común de los modales (`Dialog` y `Sheet`): bloquea el scroll de la página, da el
 * foco inicial (respeta un `autoFocus` de dentro), lo atrapa con Tab y lo devuelve al cerrar.
 */
export function useModalFocus(panelRef: RefObject<HTMLElement | null>, { onEscape, returnFocusTo }: ModalFocusOptions): void {
  // Siempre la última versión de los callbacks, sin volver a montar el efecto.
  const latest = useRef({ onEscape, returnFocusTo })
  useEffect(() => {
    latest.current = { onEscape, returnFocusTo }
  })

  // Quién tenía el foco al abrir. Se lee al renderizar, no en el efecto: un hijo con `autoFocus` ya
  // habría tomado el foco cuando corre el efecto y el modal «devolvería» el foco a un elemento que
  // desaparece con él, en vez de al botón que lo abrió.
  const [previouslyFocused] = useState(() => document.activeElement as HTMLElement | null)

  useEffect(() => {
    const token = Symbol('modal')
    stack.push(token)
    document.body.style.overflow = 'hidden'

    // Foco inicial: si un hijo ya lo tomó con `autoFocus`, se respeta; si no, el primer control.
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      const focusable = getFocusable(panel)
      ;(focusable[0] ?? panel).focus()
    }

    // Fase de burbuja (no de captura): los controles de dentro que usan Esc para lo suyo (un menú,
    // el campo de "nuevo proyecto"…) llaman a stopPropagation y el modal ya no se entera.
    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return
        e.stopPropagation()
        latest.current.onEscape()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = getFocusable(panelRef.current)
        if (items.length === 0) return
        // Si el foco se perdió (un campo que se desmontó lo dejó en <body>), vuelve al panel en vez de
        // escaparse a la página de detrás.
        if (!panelRef.current.contains(document.activeElement)) {
          e.preventDefault()
          ;(e.shiftKey ? items[items.length - 1] : items[0]).focus()
          return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      const i = stack.indexOf(token)
      if (i !== -1) stack.splice(i, 1)
      if (stack.length === 0) document.body.style.overflow = ''
      const origin = previouslyFocused && previouslyFocused !== document.body && previouslyFocused.isConnected ? previouslyFocused : null
      ;(origin ?? latest.current.returnFocusTo?.())?.focus()
    }
    // Solo al montar y desmontar: el panel de un modal vive mientras está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
