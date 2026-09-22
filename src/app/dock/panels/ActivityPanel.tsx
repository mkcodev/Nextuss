import { formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Activity } from 'lucide-react'
import { EmptyState, Icon, Skeleton } from '../../../design/primitives'
import { useActivityFeed } from '../../../features/gamification/useActivityFeed'

export function ActivityPanel() {
  const items = useActivityFeed()

  if (items === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Sin actividad todavía"
        description="Completa un hábito o un objetivo y aparecerá aquí."
        className="p-4"
      />
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: item.color ? `${item.color}18` : 'var(--nx-accent-soft)',
              color: item.color ?? 'var(--nx-accent)',
            }}
          >
            <Icon name={item.icon} size={13} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text">{item.title}</p>
            <p className="text-[11px] text-text-faint">
              {item.subtitle} · {formatDistanceToNowStrict(item.time, { addSuffix: true, locale: es })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
