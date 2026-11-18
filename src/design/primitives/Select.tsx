import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-8 w-full rounded-sm border border-border-strong bg-surface px-2.5 text-ui text-text transition-colors duration-(--dur-fast) ease-(--ease-standard) focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}
