import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

/** Campo numérico que deja borrarlo para escribir otro número: el límite se aplica al salir del
 *  campo, no en cada tecla (antes, borrar ponía 1 y al escribir "5" quedaba "15"). */
export function NumberInput({ value, onChange, min = 1, max, className, onBlur, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      {...props}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n) && n >= min && (max === undefined || n <= max)) onChange(n)
      }}
      onBlur={(e) => {
        const n = Number(draft)
        if (draft !== null) {
          if (draft === '' || !Number.isFinite(n) || n < min) onChange(min)
          else if (max !== undefined && n > max) onChange(max)
        }
        setDraft(null)
        onBlur?.(e)
      }}
      className={cn(
        'h-8 w-16 rounded-sm border border-border bg-surface px-2 text-sm tabular-nums text-text focus:border-accent',
        className,
      )}
    />
  )
}
