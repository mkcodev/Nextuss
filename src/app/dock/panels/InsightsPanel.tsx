import { useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useInsights } from '../../../features/stats/insights/useInsights'
import { cn } from '../../../lib/cn'

const MAX_SHOWN = 3

const SEVERITY_DOT: Record<string, string> = {
  warn: 'bg-warning',
  good: 'bg-success',
  neutral: 'bg-text-faint',
}

export function InsightsPanel() {
  const { loading, insights, dismiss } = useInsights('30d')
  const navigate = useNavigate()

  if (loading) {
    return <p className="text-xs text-text-faint">Cargando…</p>
  }

  if (insights.length === 0) {
    return <p className="text-xs text-text-faint">Sin insights todavía — sigue registrando datos.</p>
  }

  return (
    <div className="space-y-2.5">
      {insights.slice(0, MAX_SHOWN).map((insight) => (
        <div
          key={insight.key}
          className="group flex items-start gap-2.5 rounded-lg px-1 py-0.5 -mx-1 hover:bg-surface-hover"
        >
          <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', SEVERITY_DOT[insight.severity])} />
          <button
            onClick={() => navigate('/estadisticas?tab=insights')}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-xs font-medium text-text">{insight.title}</p>
            <p className="line-clamp-2 text-xs text-text-faint">{insight.body}</p>
          </button>
          <button
            onClick={() => dismiss(insight.key)}
            title="Descartar"
            className="mt-0.5 shrink-0 rounded p-0.5 text-text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
          >
            <X size={12} strokeWidth={1.75} />
          </button>
        </div>
      ))}
      <button
        onClick={() => navigate('/estadisticas?tab=insights')}
        className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
      >
        <Sparkles size={12} strokeWidth={1.75} /> Ver todos
      </button>
    </div>
  )
}
