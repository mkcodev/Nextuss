import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-sm border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:border-accent',
        className,
      )}
      {...props}
    />
  )
}
