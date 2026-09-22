import { useState } from 'react'
import { ChevronDown, Sparkles, TriangleAlert, X } from 'lucide-react'
import { useInsights } from '../insights/useInsights'
import type { Insight } from '../insights'
import { Badge, Card, EmptyState, Skeleton } from '../../../design/primitives'
import { BarSeries, LineTrend } from '../charts'
import { cn } from '../../../lib/cn'
import type { StatsRange } from '../range'

interface InsightsTabProps {
  range: StatsRange
}

const SEVERITY_BADGE: Record<Insight['severity'], { tone: 'warning' | 'success' | 'neutral'; label: string }> = {
  warn: { tone: 'warning', label: 'Atención' },
  good: { tone: 'success', label: 'Positivo' },
  neutral: { tone: 'neutral', label: 'Observación' },
}

export function InsightsTab({ range }: InsightsTabProps) {
  const { loading, insights, dismiss } = useInsights(range)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Todavía no hay suficientes datos para insights"
        description="Sigue registrando hábitos, tareas y check-ins — en cuanto haya patrones claros con datos suficientes aparecerán aquí."
      />
    )
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <InsightCard
          key={insight.key}
          insight={insight}
          expanded={expandedKey === insight.key}
          onToggle={() => setExpandedKey((k) => (k === insight.key ? null : insight.key))}
          onDismiss={() => dismiss(insight.key)}
        />
      ))}
    </div>
  )
}

function InsightCard({
  insight,
  expanded,
  onToggle,
  onDismiss,
}: {
  insight: Insight
  expanded: boolean
  onToggle: () => void
  onDismiss: () => void
}) {
  const badge = SEVERITY_BADGE[insight.severity]

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            {insight.severity === 'warn' && <TriangleAlert size={13} strokeWidth={1.75} className="text-warning" />}
          </div>
          <h3 className="text-sm font-semibold text-text">{insight.title}</h3>
          <p className="mt-1 text-sm text-text-muted">{insight.body}</p>
        </div>
        <button
          onClick={onDismiss}
          title="Descartar — no volverá a aparecer"
          className="shrink-0 rounded-md p-1 text-text-faint transition-colors hover:bg-surface-hover hover:text-text"
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      {insight.evidence && insight.evidence.points.length > 0 && (
        <div className="mt-3">
          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-medium text-text-faint transition-colors hover:text-text"
          >
            <ChevronDown size={13} strokeWidth={2} className={cn('transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Ocultar evidencia' : 'Ver evidencia'}
          </button>
          {expanded && (
            <div className="mt-2">
              {insight.evidence.kind === 'bar' ? (
                <BarSeries
                  data={insight.evidence.points}
                  xKey="label"
                  series={[{ key: 'value', label: 'Valor', color: 'var(--nx-accent)' }]}
                  height={140}
                />
              ) : (
                <LineTrend
                  data={insight.evidence.points}
                  xKey="label"
                  series={[{ key: 'value', label: 'Valor', color: 'var(--nx-accent)' }]}
                  height={140}
                />
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
