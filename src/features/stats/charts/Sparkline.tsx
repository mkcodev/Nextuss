interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

/** SVG mínimo para meter una tendencia dentro de un KPI o de una fila de hábito. */
export function Sparkline({ values, width = 64, height = 20, color = 'var(--nx-accent)', strokeWidth = 1.5 }: SparklineProps) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = width / (values.length - 1)
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
