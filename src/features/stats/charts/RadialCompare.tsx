import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { useChartTheme } from './chartTheme'

export interface RadialCompareItem {
  key: string
  label: string
  value: number // 0..1
  color: string
}

interface RadialCompareProps {
  items: RadialCompareItem[]
  height?: number
  centerLabel?: string
}

/** Varios anillos radiales concéntricos comparando ratios 0..1 (p. ej. cumplimiento vs periodo
 * anterior, o de varios atributos). Leyenda propia — el legend de Recharts no encaja con el resto
 * de la app. */
export function RadialCompare({ items, height = 180, centerLabel }: RadialCompareProps) {
  const theme = useChartTheme()
  const data = items.map((item) => ({
    name: item.label,
    value: Math.round(item.value * 100),
    fill: item.color,
  }))

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={data} innerRadius="35%" outerRadius="100%" startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: theme.grid }} cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-text-faint">{centerLabel}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
            {item.label} · {Math.round(item.value * 100)}%
          </div>
        ))}
      </div>
    </div>
  )
}
