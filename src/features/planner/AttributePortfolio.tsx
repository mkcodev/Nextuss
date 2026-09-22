import { Card, Icon } from '../../design/primitives'
import type { Attribute, Goal } from '../../db/types'

/** Which life areas (attributes) have an active goal this period, reusing the icon/color already used for habits. */
export function AttributePortfolio({ goals, attributes }: { goals: Goal[]; attributes: Attribute[] }) {
  const activeIds = new Set(goals.map((g) => g.attributeId).filter((id): id is number => id != null))
  if (activeIds.size === 0) return null

  return (
    <Card className="p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-text-faint">Áreas activas</p>
      <div className="flex flex-wrap gap-2">
        {attributes
          .filter((a) => activeIds.has(a.id!))
          .map((a) => {
            const attrGoals = goals.filter((g) => g.attributeId === a.id)
            const done = attrGoals.filter((g) => g.done).length
            return (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
              >
                <Icon name={a.icon} size={12} style={{ color: a.color }} />
                <span className="text-text">{a.name}</span>
                <span className="tabular-nums text-text-faint">
                  {done}/{attrGoals.length}
                </span>
              </span>
            )
          })}
      </div>
    </Card>
  )
}
