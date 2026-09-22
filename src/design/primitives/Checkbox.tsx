import { Check } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string
}

export function Checkbox({ label, className, checked, ...props }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-text', className)}>
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <input type="checkbox" checked={checked} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" {...props} />
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
            checked ? 'border-accent bg-accent text-white' : 'border-border-strong bg-bg-soft',
          )}
        >
          {checked && <Check size={11} strokeWidth={3} />}
        </span>
      </span>
      {label}
    </label>
  )
}
