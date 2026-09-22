import { Shield, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, Icon, ProgressBar, RingProgress } from '../../../design/primitives'
import { usePlayerProgress } from '../../../features/gamification/usePlayerProgress'
import { progressForXp } from '../../../lib/xp'

export function ProgressPanel() {
  const { level, xpIntoLevel, xpForNextLevel, shields, attributes } = usePlayerProgress()
  const pct = xpForNextLevel > 0 ? xpIntoLevel / xpForNextLevel : 0
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RingProgress value={pct} size={48} strokeWidth={4}>
            <span className="text-sm font-semibold tabular-nums text-text">{level}</span>
          </RingProgress>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-faint">
              Nivel
            </p>
            <p className="text-sm font-semibold tabular-nums text-text">
              {xpIntoLevel} <span className="font-normal text-text-faint">/ {xpForNextLevel} XP</span>
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-text-muted"
          title={`${shields} escudo(s) de racha disponibles este mes`}
        >
          <Shield size={13} strokeWidth={2} className={shields > 0 ? 'text-accent' : ''} />
          <span className="text-xs font-medium tabular-nums">{shields}</span>
        </div>
      </div>

      {attributes.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Sin atributos todavía"
          description="Asigna un atributo a tus hábitos para ver su progreso aquí."
          className="p-4"
          action={
            <Button variant="secondary" onClick={() => navigate('/habitos')} className="text-xs">
              Ir a Hábitos
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {attributes.map((attr) => {
            const attrProgress = progressForXp(attr.xp)
            const ratio = attrProgress.xpForNextLevel > 0 ? attrProgress.xpIntoLevel / attrProgress.xpForNextLevel : 0
            return (
              <div key={attr.id} className="flex items-center gap-2" title={`${attr.xp} XP total`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-text-muted">
                  <Icon name={attr.icon} size={13} strokeWidth={1.75} />
                </span>
                <span className="w-16 shrink-0 truncate text-xs text-text-muted">{attr.name}</span>
                <ProgressBar value={ratio} className="h-1.5" />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-text-faint">
                  Nv. {attrProgress.level}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
