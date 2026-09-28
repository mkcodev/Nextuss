import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Nombre del grupo para lectores de pantalla (p. ej. "Periodo"). */
  label?: string
  size?: 'sm' | 'md'
  className?: string
  /** `radio` (por defecto) para filtros y modos; `tabs` solo cuando cada opción muestra un panel. */
  semantics?: 'radio' | 'tabs'
}

/** Selector de una opción entre varias: grupo de radio (filtros, modos) o `tablist` (secciones).
 *  Solo la opción activa está en el orden de tabulación y las flechas mueven la selección.
 *  `Tabs` es este mismo componente en modo pestañas. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'sm',
  className,
  semantics = 'radio',
}: SegmentedControlProps<T>) {
  const tabs = semantics === 'tabs'
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : null
    if (!delta && jump === null) return
    e.preventDefault()
    const next = jump ?? (index + delta + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role={tabs ? 'tablist' : 'radiogroup'} aria-label={label} className={cn('inline-flex gap-0.5 rounded-md border border-border p-0.5', className)}>
      {options.map((o, i) => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role={tabs ? 'tab' : 'radio'}
            aria-selected={tabs ? selected : undefined}
            aria-checked={tabs ? undefined : selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex items-center gap-1.5 rounded-sm font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-6 px-2.5 text-xs' : 'h-7 px-3 text-[13px]',
              selected ? 'bg-surface-hover text-text' : 'text-text-muted hover:text-text',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
