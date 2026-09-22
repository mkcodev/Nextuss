import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
