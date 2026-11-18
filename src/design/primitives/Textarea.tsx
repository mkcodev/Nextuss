import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-sm border border-border-strong bg-surface px-2.5 py-[5px] text-ui text-text transition-colors duration-(--dur-fast) ease-(--ease-standard) placeholder:text-text-faint focus:border-accent',
          className,
        )}
        {...props}
      />
    )
  },
)
