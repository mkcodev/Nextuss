// Tooltip propio compartido por LineTrend/BarSeries/AreaStack — el de Recharts por defecto no
// respeta el estilo de la app. Tipado laxo a propósito: el `content` de Recharts le pasa props que
// varían de gráfico a gráfico y encadenar los tipos internos de la librería no aporta seguridad real.
interface ChartTooltipPayloadEntry {
  name?: string
  value?: number | string
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: ChartTooltipPayloadEntry[]
  formatValue?: (value: number | string | undefined) => string
}

export function ChartTooltip({ active, label, payload, formatValue }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-card">
      {label != null && <p className="mb-1 font-medium text-text">{String(label)}</p>}
      <div className="space-y-0.5">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5 text-text-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span>{entry.name}:</span>
            <span className="font-medium text-text">{formatValue ? formatValue(entry.value) : entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
