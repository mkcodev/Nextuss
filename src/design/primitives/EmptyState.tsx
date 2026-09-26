import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-6 py-8 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-1.5 grid size-9 place-items-center rounded-md bg-surface-hover text-text-muted">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-balance text-text">{title}</p>
      {description && <p className="max-w-sm text-sm text-pretty text-text-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
