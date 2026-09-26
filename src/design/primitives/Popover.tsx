import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface PopoverProps {
  /** Render del disparador; recibe lo necesario para abrir/cerrar y anunciar el estado. */
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-controls': string; id: string }) => ReactNode
  /** Contenido del panel; `close` lo cierra (p. ej. tras elegir un atajo). */
  children: (close: () => void) => ReactNode
  /** Nombre accesible del panel (p. ej. "Fecha"). */
  label: string
  align?: 'left' | 'right'
  className?: string
}

/** Panel flotante no modal para controles que no son una lista de opciones (p. ej. fecha + hora).
 *  Esc lo cierra sin cerrar el diálogo de debajo y devuelve el foco al disparador; clic fuera, también. */
export function Popover({ trigger, children, label, align = 'left', className }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerId = useId()
  const panelId = useId()
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('input, button, select')?.focus()
    else if (wasOpen.current) document.getElementById(triggerId)?.focus()
    wasOpen.current = open
  }, [open, triggerId])

  const close = () => setOpen(false)

  return (
    <div
      ref={rootRef}
      className={cn('relative', className)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          close()
        }
      }}
      onBlur={(e) => {
        // Salir con Tab fuera del disparador y del panel lo cierra.
        if (open && !rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      {trigger({ onClick: () => setOpen((v) => !v), 'aria-expanded': open, 'aria-controls': panelId, id: triggerId })}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={label}
          className={cn(
            'absolute top-[calc(100%+0.375rem)] z-dialog w-64 rounded-md border border-border bg-surface p-3 shadow-dialog',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  )
}
