import type { ReactNode } from 'react'
import { Card, EmptyState, Skeleton } from '../../../design/primitives'
import { cn } from '../../../lib/cn'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  loading?: boolean
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
  children: ReactNode
}

/** Envoltorio común a todo gráfico: título/subtítulo/acción, skeleton mientras carga, empty state
 * cuando no hay datos suficientes. Todo gráfico de la Fase 4 pasa por aquí. */
export function ChartCard({
  title,
  subtitle,
  action,
  loading,
  empty,
  emptyTitle = 'Todavía no hay datos suficientes',
  emptyDescription,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {subtitle && <p className="text-xs text-text-faint">{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : empty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} className="border-none p-6" />
      ) : (
        children
      )}
    </Card>
  )
}
