import { cn } from '../../lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div className={cn('flex gap-0.5 rounded-lg border border-border p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
            value === o.value ? 'bg-accent-soft text-accent' : 'text-text-faint hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
