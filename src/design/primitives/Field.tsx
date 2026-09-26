import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (inputProps: { id: string; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Wraps a form control with a `<label>` and optional hint/error text, wiring `htmlFor`/`aria-describedby`
 * so every field in the app gets that association for free instead of each form re-deriving it. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-medium text-text-muted">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
