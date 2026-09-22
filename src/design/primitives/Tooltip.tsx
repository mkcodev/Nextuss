import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  className?: string
}

/** Popover posicionado sobre el elemento hijo, accesible vía aria-describedby. Usado por
 * CalendarHeatmap y los gráficos para mostrar detalle de un punto/celda al pasar el ratón. */
export function Tooltip({ content, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  const show = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) setCoords({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    setOpen(true)
  }
  const hide = () => setOpen(false)

  return (
    <>
      <span
        ref={anchorRef}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={cn('inline-flex', className)}
      >
        {children}
      </span>
      {open &&
        content != null &&
        createPortal(
          <div
            role="tooltip"
            id={id}
            style={{ top: coords.top, left: coords.left }}
            className="pointer-events-none fixed z-tooltip -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text shadow-card"
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  )
}
