import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-block min-w-[18px] rounded-xs bg-surface-hover px-1.5 text-center font-mono text-2xs font-medium tracking-[-0.01em] text-text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
