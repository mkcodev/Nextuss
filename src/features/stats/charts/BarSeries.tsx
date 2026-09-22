import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'
import type { ChartSeriesSpec } from './LineTrend'

interface BarSeriesProps {
  data: Record<string, unknown>[]
  xKey: string
  series: ChartSeriesSpec[]
  height?: number
  stacked?: boolean
  formatValue?: (value: number | string | undefined) => string
  /** Línea horizontal de referencia (p. ej. el `targetValue` de un hábito de cantidad/duración). */
  referenceValue?: number
  referenceLabel?: string
}

export function BarSeries({
  data,
  xKey,
  series,
  height = 220,
  stacked,
  formatValue,
  referenceValue,
  referenceLabel,
}: BarSeriesProps) {
  const theme = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.textFaint} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={theme.textFaint} fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip formatValue={formatValue} />} cursor={{ fill: theme.grid, opacity: 0.4 }} />
        {referenceValue != null && (
          <ReferenceLine
            y={referenceValue}
            stroke={theme.textFaint}
            strokeDasharray="4 4"
            label={{ value: referenceLabel, position: 'insideTopRight', fill: theme.textFaint, fontSize: 10 }}
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            stackId={stacked ? 'stack' : undefined}
            radius={stacked ? 0 : [3, 3, 0, 0]}
            maxBarSize={28}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
