// Rejilla anual estilo GitHub. Recharts no tiene heatmap de calendario, así que esto es SVG propio.
// El tooltip NO reutiliza el primitive `Tooltip` (que envuelve en un <span>) porque un <span> no es
// contenido SVG válido dentro de un <svg> — en su lugar replica el mismo patrón portal+fixed a mano.
import { addDays, differenceInCalendarDays, format, getISOWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { dateKey, parseDateKey, WEEKDAY_LABELS_ES } from '../../../lib/dates'
import { cn } from '../../../lib/cn'

interface CalendarHeatmapProps {
  from: string
  to: string
  /** date ('YYYY-MM-DD') -> intensidad 0..1. Los días sin entrada se pintan como "sin datos". */
  values: Record<string, number>
  onDayClick?: (date: string) => void
  cellSize?: number
  formatTooltip?: (date: string, value: number | undefined) => string
}

const CELL_GAP = 3
const LABEL_GUTTER = 18
/** Espacio extra entre el último día de un mes y el primero del siguiente — lo que separa
 * visualmente los "bloques" de mes, además de su propia etiqueta. */
const MONTH_GAP = 7
const MONTH_ROW_HEIGHT = 13
const WEEK_ROW_HEIGHT = 10

function levelColor(value: number | undefined): string {
  if (!value || value <= 0) return 'var(--nx-border)'
  const pct = Math.round(12 + Math.min(1, value) * 78) // 12%..90%
  return `color-mix(in srgb, var(--nx-accent) ${pct}%, transparent)`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function CalendarHeatmap({
  from,
  to,
  values,
  onDayClick,
  cellSize = 12,
  formatTooltip,
}: CalendarHeatmapProps) {
  const [hover, setHover] = useState<{ date: string; x: number; y: number } | null>(null)

  const { cells, cols, gridWidth } = useMemo(() => {
    const fromDate = parseDateKey(from)
    const toDate = parseDateKey(to)
    const gridStart = addDays(fromDate, -fromDate.getDay())
    const totalDays = differenceInCalendarDays(toDate, gridStart) + 1
    const weeksCount = Math.ceil(totalDays / 7)

    const colList: { x: number; monthLabel: string | null; weekLabel: string }[] = []
    const cellList: { date: string; col: number; row: number; inRange: boolean }[] = []
    let x = 0
    let prevMonth = -1
    for (let col = 0; col < weeksCount; col++) {
      const colStart = addDays(gridStart, col * 7)
      const month = colStart.getMonth()
      const isMonthStart = month !== prevMonth
      if (col > 0 && isMonthStart) x += MONTH_GAP
      colList.push({
        x,
        monthLabel: isMonthStart ? capitalize(format(colStart, 'MMM', { locale: es })) : null,
        weekLabel: String(getISOWeek(colStart)),
      })
      prevMonth = month
      for (let row = 0; row < 7; row++) {
        const d = addDays(colStart, row)
        const key = dateKey(d)
        cellList.push({ date: key, col, row, inRange: key >= from && key <= to })
      }
      x += cellSize + CELL_GAP
    }
    return { cells: cellList, cols: colList, gridWidth: x - CELL_GAP }
  }, [from, to, cellSize])

  // Con columnas muy juntas dos números pegados se leen mal — se salta una de cada dos.
  const weekLabelStep = cellSize + CELL_GAP < 16 ? 2 : 1
  const headerHeight = MONTH_ROW_HEIGHT + WEEK_ROW_HEIGHT
  const height = headerHeight + 7 * (cellSize + CELL_GAP)

  return (
    <div className="overflow-x-auto">
      <svg
        width={gridWidth + LABEL_GUTTER}
        height={height}
        role="img"
        aria-label="Mapa de calor de actividad diaria, con meses y número de semana ISO"
      >
        {WEEKDAY_LABELS_ES.map((label, row) =>
          row % 2 === 1 ? (
            <text
              key={row}
              x={0}
              y={headerHeight + row * (cellSize + CELL_GAP) + cellSize / 2 + 3}
              fontSize={9}
              fill="var(--nx-text-faint)"
            >
              {label}
            </text>
          ) : null,
        )}
        <g transform={`translate(${LABEL_GUTTER}, 0)`}>
          {cols.map(
            (col, i) =>
              col.monthLabel && (
                <text key={`m-${i}`} x={col.x} y={MONTH_ROW_HEIGHT - 3} fontSize={10} fontWeight={500} fill="var(--nx-text-muted)">
                  {col.monthLabel}
                </text>
              ),
          )}
          {cols.map(
            (col, i) =>
              i % weekLabelStep === 0 && (
                <text
                  key={`w-${i}`}
                  x={col.x + cellSize / 2}
                  y={headerHeight - 2}
                  fontSize={7}
                  textAnchor="middle"
                  fill="var(--nx-text-faint)"
                >
                  {col.weekLabel}
                </text>
              ),
          )}
          {cols.slice(1).map(
            (col, i) =>
              col.monthLabel && (
                <line
                  key={`sep-${i}`}
                  x1={col.x - MONTH_GAP / 2}
                  x2={col.x - MONTH_GAP / 2}
                  y1={headerHeight}
                  y2={height}
                  stroke="var(--nx-border)"
                  strokeWidth={1}
                />
              ),
          )}
          {cells
            .filter((c) => c.inRange)
            .map((cell) => {
              const x = cols[cell.col].x
              const y = headerHeight + cell.row * (cellSize + CELL_GAP)
              return (
                <rect
                  key={cell.date}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={3}
                  fill={levelColor(values[cell.date])}
                  className={cn(onDayClick && 'cursor-pointer')}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setHover({ date: cell.date, x: rect.left + rect.width / 2, y: rect.top })
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={onDayClick ? () => onDayClick(cell.date) : undefined}
                />
              )
            })}
        </g>
      </svg>

      {hover &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: hover.y - 8, left: hover.x }}
            className="pointer-events-none fixed z-tooltip -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text shadow-card"
          >
            {formatTooltip ? formatTooltip(hover.date, values[hover.date]) : hover.date}
          </div>,
          document.body,
        )}
    </div>
  )
}
