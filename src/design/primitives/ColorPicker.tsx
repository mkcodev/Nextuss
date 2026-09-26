import { cn } from '../../lib/cn'
import { ENTITY_COLORS, ENTITY_COLOR_NAMES } from '../../lib/colors'
import { useRovingRadio } from './useRovingRadio'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

/** Selector de color de entidad (proyecto, hábito, tarea): `radiogroup` con el nombre de cada color,
 *  para que no dependa solo de verlo. Un color guardado que ya no está en la paleta se sigue mostrando. */
export function ColorPicker({ value, onChange, label = 'Color', className }: ColorPickerProps) {
  const options: { color: string; name: string }[] = ENTITY_COLORS.map((c, i) => ({ color: c, name: ENTITY_COLOR_NAMES[i] }))
  if (!options.some((o) => o.color.toLowerCase() === value.toLowerCase())) options.push({ color: value, name: 'Color actual' })
  const selected = options.findIndex((o) => o.color.toLowerCase() === value.toLowerCase())
  const itemProps = useRovingRadio(options.length, selected, (i) => onChange(options[i].color))

  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o, i) => {
        const on = o.color.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={o.color}
            {...itemProps(i)}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.name}
            title={o.name}
            onClick={() => onChange(o.color)}
            // Seleccionado = anillo de tinta pegado; foco de teclado = contorno índigo separado (global).
            className={cn(
              'size-6 rounded-full ring-offset-2 ring-offset-bg-soft transition-shadow focus-visible:outline-offset-4',
              on ? 'ring-2 ring-text' : 'hover:ring-2 hover:ring-border-strong',
            )}
            style={{ backgroundColor: o.color }}
          />
        )
      })}
    </div>
  )
}
