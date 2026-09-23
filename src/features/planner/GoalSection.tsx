import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { Card } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { listAttributes } from '../../db/repositories/gamification'
import { GoalCard } from './GoalCard'
import type { Goal } from '../../db/types'

interface GoalSectionProps {
  title: string
  emptyLabel: string
  goals: Goal[]
  onCreate: () => void
  /** Only meaningful when the section can genuinely be wide (the Objetivos tab) — never in the narrow rail. */
  twoColOnWide?: boolean
}

export function GoalSection({ title, emptyLabel, goals, onCreate, twoColOnWide = false }: GoalSectionProps) {
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted">{title}</h2>
        <button onClick={onCreate} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <Plus size={13} /> Nuevo
        </button>
      </div>
      {goals.length === 0 ? (
        <Card className="p-4 text-sm text-text-faint">{emptyLabel}</Card>
      ) : (
        <div className={cn('grid grid-cols-1 gap-3', twoColOnWide && goals.length > 1 && 'md:grid-cols-2')}>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} attributes={attributes} />
          ))}
        </div>
      )}
    </section>
  )
}
