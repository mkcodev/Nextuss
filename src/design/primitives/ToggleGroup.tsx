import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface ToggleOption<T extends string | number> {
  value: T
  label: ReactNode
  /** Nombre completo cuando la etiqueta visible es corta ("L" → "Lunes") o solo un icono/color. */
  ariaLabel?: string
  /** Estilo cuando está marcada (p. ej. el color de una prioridad). */
  activeStyle?: CSSProperties
}

interface ToggleGroupProps<T extends string | number> {
  options: ToggleOption<T>[]
  value: T | undefined
  onChange: (value: T | undefined) => void
  /** Nombre del grupo, obligatorio: sustituye al `<label>` que antes no apuntaba a nada. */
  label: string
  /** Permite desmarcar la opción activa volviendo a pulsarla (p. ej. "sin prioridad"). */
  allowDeselect?: boolean
  className?: string
}

/** Grupo de botones de elección única (prioridad, energía, estimación, periodo…). Cada botón anuncia
 *  su estado con `aria-pressed`, así que el estado no depende solo del color. */
export function ToggleGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  allowDeselect,
  className,
}: ToggleGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            aria-label={o.ariaLabel}
            onClick={() => onChange(on && allowDeselect ? undefined : o.value)}
            style={on ? o.activeStyle : undefined}
            className={cn(
              'inline-flex h-7 items-center justify-center gap-1.5 rounded-sm border px-2.5 text-[13px] font-medium transition-colors',
              on
                ? o.activeStyle
                  ? 'font-semibold'
                  : 'border-accent bg-accent-soft text-accent'
                : 'border-border text-text-muted hover:bg-surface-hover hover:text-text',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
