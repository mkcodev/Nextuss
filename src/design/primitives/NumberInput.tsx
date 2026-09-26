import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number
  onChange: (value: number) => void
  min?: number
}

/** Campo numérico que deja borrarlo para escribir otro número: el mínimo se aplica al salir del
 *  campo, no en cada tecla (antes, borrar ponía 1 y al escribir "5" quedaba "15"). */
export function NumberInput({ value, onChange, min = 1, className, onBlur, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <input
      {...props}
      type="number"
      inputMode="numeric"
      min={min}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n) && n >= min) onChange(n)
      }}
      onBlur={(e) => {
        const n = Number(draft)
        if (draft !== null && (draft === '' || !Number.isFinite(n) || n < min)) onChange(min)
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
