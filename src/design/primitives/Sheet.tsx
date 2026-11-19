import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { PRESET, motionFor } from '../motion'
import { useModalFocus } from './useModalFocus'

interface SheetProps {
  open: boolean
  onClose: () => void
  /** `id` del encabezado de dentro que da nombre a la hoja (el contenido pone su propio título y su
   *  botón de cerrar). */
  labelledBy: string
  children: ReactNode
  /** Dónde devolver el foco al cerrar si quien lo tenía al abrir ya no está (por ejemplo, tras entrar
   *  por un enlace directo, sin ningún control que lo tuviera). */
  returnFocusTo?: () => HTMLElement | null
}

const QUERY = '(min-width: 768px)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const isWide = () => window.matchMedia(QUERY).matches

/**
 * Hoja modal: panel a la derecha desde `md` y hoja inferior en pantallas estrechas. Cierra con Esc y
 * con un clic en el fondo, bloquea el scroll de la página y mantiene el foco dentro (mismo
 * comportamiento que `Dialog`, vía `useModalFocus`). Con movimiento reducido solo hace un fundido.
 */
export function Sheet({ open, ...props }: SheetProps) {
  // Al <body>: la hoja puede abrirse desde dentro de una página (con su propio contexto de apilado) y
  // tiene que quedar por encima del panel derecho y de la barra lateral.
  return createPortal(<AnimatePresence>{open && <SheetPanel {...props} />}</AnimatePresence>, document.body)
}

function SheetPanel({ onClose, labelledBy, children, returnFocusTo }: Omit<SheetProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null)
  const pointerDownOnBackdrop = useRef(false)
  const reduceMotion = useReducedMotion()
  const wide = useSyncExternalStore(subscribe, isWide, () => true)

  useModalFocus(panelRef, { onEscape: onClose, returnFocusTo })

  const side = wide
    ? { initial: { x: '100%' }, animate: { x: '0%' }, exit: { x: '100%', transition: PRESET.sheet.exit.transition } }
    : PRESET.sheet

  return (
    <m.div
      className={cn('fixed inset-0 z-dialog flex bg-scrim', wide ? 'justify-end' : 'items-end')}
      initial={PRESET.scrim.initial}
      animate={reduceMotion ? { opacity: 1, transition: motionFor(true, {}) } : PRESET.scrim.animate}
      exit={reduceMotion ? { opacity: 0, transition: motionFor(true, {}) } : PRESET.scrim.exit}
      onPointerDown={(e) => {
        pointerDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pointerDownOnBackdrop.current && e.target === e.currentTarget) onClose()
        pointerDownOnBackdrop.current = false
      }}
    >
      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'relative w-full overflow-y-auto overscroll-contain border-border bg-surface shadow-dialog',
          wide ? 'h-full max-w-[26rem] border-l' : 'max-h-[88dvh] rounded-t-lg border-t pb-[env(safe-area-inset-bottom)]',
        )}
        initial={reduceMotion ? { opacity: 0 } : side.initial}
        animate={reduceMotion ? { opacity: 1 } : side.animate}
        exit={reduceMotion ? { opacity: 0 } : side.exit}
        transition={motionFor(reduceMotion, PRESET.sheet.transition)}
      >
        {children}
      </m.div>
    </m.div>
  )
}
