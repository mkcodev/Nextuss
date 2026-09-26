import { cn } from '../../lib/cn'

interface ProgressBarProps {
  value: number // 0..1
  className?: string
  barClassName?: string
}

export function ProgressBar({ value, className, barClassName }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-border', className)}>
      <div
        // scaleX en vez de `width`: anima sin recalcular el layout.
        className={cn('h-full w-full origin-left rounded-full bg-accent transition-transform duration-500 ease-out', barClassName)}
        style={{ transform: `scaleX(${pct / 100})` }}
      />
    </div>
  )
}
