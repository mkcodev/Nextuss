import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'
import type { ChartSeriesSpec } from './LineTrend'

interface AreaStackProps {
  data: Record<string, unknown>[]
  xKey: string
  series: ChartSeriesSpec[]
  height?: number
  formatValue?: (value: number | string | undefined) => string
}

/** Área acumulada (curva de XP, minutos de foco acumulados, etc.) — cada serie se apila sobre la anterior. */
export function AreaStack({ data, xKey, series, height = 220, formatValue }: AreaStackProps) {
  const theme = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.textFaint} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={theme.textFaint} fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip formatValue={formatValue} />} cursor={{ stroke: theme.grid }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            stroke={s.color}
            strokeWidth={1.75}
            fill={`url(#area-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
