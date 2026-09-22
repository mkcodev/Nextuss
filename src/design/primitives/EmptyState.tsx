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
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-bg-soft text-text-faint">
          <Icon size={18} strokeWidth={1.75} />
        </div>
      )}
      <p className="text-sm font-medium text-text-muted">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-faint">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
