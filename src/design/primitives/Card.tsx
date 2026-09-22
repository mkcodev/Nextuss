import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
}

export function Card({ className, glow, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface backdrop-blur-xl shadow-card',
        glow && 'shadow-glow',
        className,
      )}
      {...props}
    />
  )
}
