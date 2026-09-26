import type { ReactNode } from 'react'
import { SegmentedControl } from './SegmentedControl'

export interface TabOption<T extends string> {
  key: T
  label: string
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  tabs: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  label?: string
  className?: string
}

/** Pestañas de sección. Mismo componente que `SegmentedControl` (un único estilo y una única
 *  semántica de `tablist`), en tamaño mediano y con la API de `key` que ya usan las páginas. */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
  return (
    <SegmentedControl
      options={tabs.map((t) => ({ value: t.key, label: t.label, icon: t.icon }))}
      value={value}
      onChange={onChange}
      label={label}
      size="md"
      className={className}
    />
  )
}
