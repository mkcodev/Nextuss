import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from './chartTheme'
import { ChartTooltip } from './ChartTooltip'

export interface ChartSeriesSpec {
  key: string
  label: string
  color: string
}

interface LineTrendProps {
  data: Record<string, unknown>[]
  xKey: string
  series: ChartSeriesSpec[]
  height?: number
  formatValue?: (value: number | string | undefined) => string
}

export function LineTrend({ data, xKey, series, height = 220, formatValue }: LineTrendProps) {
  const theme = useChartTheme()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey={xKey} stroke={theme.textFaint} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={theme.textFaint} fontSize={11} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<ChartTooltip formatValue={formatValue} />} cursor={{ stroke: theme.grid }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
