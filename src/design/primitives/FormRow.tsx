import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FormRowProps {
  label: string
  /** Si el control es un único campo, su id: la etiqueta pasa a ser un `<label htmlFor>`. */
  htmlFor?: string
  /** Controles altos (listas, grupos que ocupan varias líneas): la etiqueta se alinea arriba. */
  top?: boolean
  hint?: ReactNode
  children: ReactNode
}

/** Fila etiqueta + control de la sección "Más opciones" de los formularios (DESIGN.md: etiqueta
 *  a la izquierda en tinta atenuada, control a la derecha). */
export function FormRow({ label, htmlFor, top, hint, children }: FormRowProps) {
  const labelClass = cn('text-sm text-text-muted', top && 'pt-1')
  return (
    <div className={cn('grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2', top ? 'items-start' : 'items-center')}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      <div className="min-w-0">
        {children}
        {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      </div>
    </div>
  )
}

/** Contenedor de filas: panel hundido con separadores finos. */
export function FormRows({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div id={id} className="divide-y divide-border rounded-md border border-border bg-bg-soft px-4 py-1">
      {children}
    </div>
  )
}
