import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-sm text-text placeholder:text-text-faint focus:border-accent',
          className,
        )}
        {...props}
      />
    )
  },
)
