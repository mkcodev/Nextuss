import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  active?: boolean
}

export function IconButton({ label, active, className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-2 transition-colors',
        active ? 'bg-accent-soft text-accent' : 'text-text-muted hover:bg-surface-hover hover:text-text',
        className,
      )}
      {...props}
    />
  )
}
