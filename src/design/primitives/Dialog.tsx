import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type DialogSize = 'sm' | 'md' | 'lg'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Ancho máximo: sm 448px (por defecto), md 560px, lg 680px. */
  size?: DialogSize
  /** Fuerza (o anula) el aviso de "cambios sin guardar". Si se omite, el diálogo lo deduce: en cuanto
   *  el usuario escribe en cualquier campo de dentro, cerrar con Esc o clic fuera pide confirmación. */
  dirty?: boolean
}

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

let openDialogCount = 0

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
}

export function Dialog({ open, ...props }: DialogProps) {
  // El panel solo existe mientras está abierto: su estado (cambios, confirmación) empieza limpio cada vez.
  return <AnimatePresence>{open && <DialogPanel {...props} />}</AnimatePresence>
}

function DialogPanel({ onClose, title, children, size = 'sm', dirty }: Omit<DialogProps, 'open'>) {
  const panelRef = useRef<HTMLDivElement>(null)
  const isTopmost = useRef(false)
  const pointerDownOnBackdrop = useRef(false)
  const titleId = useId()
  const reduceMotion = useReducedMotion()
  const [touched, setTouched] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const isDirty = dirty ?? touched

  // Cierre "accidental" (Esc, clic fuera): si hay cambios, primero se pregunta. Los botones del propio
  // formulario (Cancelar, Guardar) siguen llamando a `onClose` directamente: ahí la intención es clara.
  const requestClose = () => {
    if (isDirty) setConfirming(true)
    else onClose()
  }
  const requestCloseRef = useRef(requestClose)
  const confirmingRef = useRef(confirming)
  useEffect(() => {
    requestCloseRef.current = requestClose
    confirmingRef.current = confirming
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    openDialogCount += 1
    isTopmost.current = true
    document.body.style.overflow = 'hidden'

    // Foco inicial: si un hijo ya lo tomó con `autoFocus`, se respeta; si no, el primer control.
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      const focusable = getFocusable(panel)
      ;(focusable[0] ?? panel).focus()
    }

    // Fase de burbuja (no de captura): los controles de dentro que usan Esc para lo suyo (un menú,
    // el campo de "nuevo proyecto"…) llaman a stopPropagation y el diálogo ya no se entera.
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTopmost.current) return
      if (e.key === 'Escape') {
        if (e.defaultPrevented) return
        e.stopPropagation()
        if (confirmingRef.current) setConfirming(false)
        else requestCloseRef.current()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = getFocusable(panelRef.current)
        if (items.length === 0) return
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
      openDialogCount -= 1
      isTopmost.current = false
      if (openDialogCount === 0) document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-dialog flex items-center justify-center bg-black/35 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      // Solo cierra si el clic empezó Y terminó en el fondo: seleccionar texto arrastrando desde un
      // campo y soltar fuera del panel ya no cierra el diálogo.
      onPointerDown={(e) => {
        pointerDownOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pointerDownOnBackdrop.current && e.target === e.currentTarget) requestClose()
        pointerDownOnBackdrop.current = false
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onInput={() => setTouched(true)}
        className={cn(
          'relative max-h-[85vh] w-full overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-6 shadow-dialog',
          SIZE_CLASSES[size],
        )}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
        transition={{ duration: reduceMotion ? 0 : 0.15, ease: [0.25, 1, 0.5, 1] }}
      >
        <h2 id={titleId} className="mb-4 text-base font-semibold text-balance text-text">
          {title}
        </h2>
        {children}
        {confirming && (
          <div
            role="alert"
            className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-4 flex flex-wrap items-center gap-3 border-t border-border bg-surface px-6 py-3"
          >
            <p className="flex-1 text-sm text-text">Tienes cambios sin guardar. ¿Descartarlos?</p>
            <button
              type="button"
              autoFocus
              onClick={() => setConfirming(false)}
              className="h-8 rounded-sm border border-border bg-surface px-3 text-sm font-medium text-text hover:bg-surface-hover"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                onClose()
              }}
              className="h-8 rounded-sm bg-danger/10 px-3 text-sm font-medium text-danger hover:bg-danger/15"
            >
              Descartar
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
