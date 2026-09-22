import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-border bg-bg-soft px-2.5 py-2 text-xs text-text placeholder:text-text-faint focus:border-accent',
          className,
        )}
        {...props}
      />
    )
  },
)
