import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TabOption<T extends string> {
  key: T
  label: string
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('flex gap-1 rounded-lg border border-border p-0.5', className)}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === t.key ? 'bg-accent-soft text-accent' : 'text-text-faint hover:text-text',
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}
