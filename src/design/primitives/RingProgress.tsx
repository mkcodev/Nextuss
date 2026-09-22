import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface RingSegment {
  key: string
  done: boolean
  /** Colors a completed segment differently depending on what it represents — e.g. a
   *  completed week-goal shows in the "strong" accent shade, distinct from a done task. */
  variant?: 'task' | 'week'
}

interface RingProgressProps {
  /** 0..1 — used for a single continuous arc when `segments` isn't given. */
  value?: number
  /** When given with 1+ items, the ring is split into that many equal, gapped arcs instead. */
  segments?: RingSegment[]
  size?: number
  strokeWidth?: number
  className?: string
  trackClassName?: string
  children?: ReactNode
}

// Fixed gap between segments in degrees, shrinking as segment count grows so a busy ring
// doesn't lose most of its circle to gaps.
function gapDegreesFor(count: number): number {
  return Math.max(1.5, 8 - count)
}

export function RingProgress({
  value = 0,
  segments,
  size = 56,
  strokeWidth = 5,
  className,
  trackClassName,
  children,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const hasSegments = !!segments && segments.length > 0

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-border', trackClassName)}
        />
        {hasSegments ? (
          <SegmentedArcs segments={segments!} radius={radius} size={size} strokeWidth={strokeWidth} circumference={circumference} />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke="var(--nx-accent)"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, value)))}
            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

function SegmentedArcs({
  segments,
  radius,
  size,
  strokeWidth,
  circumference,
}: {
  segments: RingSegment[]
  radius: number
  size: number
  strokeWidth: number
  circumference: number
}) {
  const gapDeg = gapDegreesFor(segments.length)
  const gapLen = (gapDeg / 360) * circumference
  const totalGap = segments.length > 1 ? gapLen * segments.length : 0
  const segLen = (circumference - totalGap) / segments.length
  const step = segLen + (segments.length > 1 ? gapLen : 0)

  return (
    <>
      {segments.map((seg, i) => (
        <circle
          key={seg.key}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(!seg.done && 'stroke-border', seg.done && seg.variant === 'week' && 'stroke-accent-strong', seg.done && seg.variant !== 'week' && 'stroke-accent')}
          strokeDasharray={`${segLen} ${circumference - segLen}`}
          strokeDashoffset={-i * step}
          style={{ transition: 'stroke 300ms ease' }}
        />
      ))}
    </>
  )
}
