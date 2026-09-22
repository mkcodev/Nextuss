import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../../design/primitives'
import { cn } from '../../../lib/cn'
import { Sparkline } from './Sparkline'

interface StatTileProps {
  label: string
  value: string
  deltaLabel?: string
  direction?: 'up' | 'down' | 'flat'
  /** Qué dirección es semánticamente "buena" para este KPI — p.ej. menos interrupciones es 'down' bueno. */
  goodDirection?: 'up' | 'down'
  sparkline?: number[]
  icon?: ReactNode
}

/** KPI: valor grande tabular, delta vs periodo anterior con flecha y color semántico, sparkline de fondo. */
export function StatTile({
  label,
  value,
  deltaLabel,
  direction = 'flat',
  goodDirection = 'up',
  sparkline,
  icon,
}: StatTileProps) {
  const isGood = direction === 'flat' ? null : direction === goodDirection
  const DirIcon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus

  return (
    <Card className="relative overflow-hidden p-4">
      {sparkline && sparkline.length > 1 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-3 opacity-40">
          <Sparkline values={sparkline} width={140} height={28} />
        </div>
      )}
      <div className="relative">
        <div className="flex items-center gap-1.5 text-xs font-medium text-text-faint">
          {icon}
          {label}
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-text">{value}</p>
        {deltaLabel && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs font-medium',
              isGood == null ? 'text-text-faint' : isGood ? 'text-success' : 'text-danger',
            )}
          >
            <DirIcon size={12} strokeWidth={2} />
            {deltaLabel}
          </div>
        )}
      </div>
    </Card>
  )
}
