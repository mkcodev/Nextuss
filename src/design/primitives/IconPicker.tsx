import { cn } from '../../lib/cn'
import { ICON_LABELS, type IconKey } from '../icons'
import { Icon } from './Icon'

interface IconPickerProps {
  options: IconKey[]
  value: string
  onChange: (icon: IconKey) => void
  label?: string
  className?: string
}

/** Selector de icono: `radiogroup` con el nombre de cada icono (antes eran botones sin nombre). */
export function IconPicker({ options, value, onChange, label = 'Icono', className }: IconPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1', className)}>
      {options.map((key) => {
        const on = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={ICON_LABELS[key]}
            title={ICON_LABELS[key]}
            onClick={() => onChange(key)}
            className={cn(
              'grid size-8 place-items-center rounded-sm border transition-colors',
              on ? 'border-accent bg-accent-soft text-accent' : 'border-transparent text-text-muted hover:bg-surface-hover hover:text-text',
            )}
          >
            <Icon name={key} size={16} strokeWidth={1.75} />
          </button>
        )
      })}
    </div>
  )
}
