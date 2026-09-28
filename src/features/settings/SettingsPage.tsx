import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, Icon, Skeleton, Input } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { useTheme } from '../../design/useTheme'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { listAchievements } from '../../db/repositories/gamification'
import { ACHIEVEMENTS } from '../../lib/achievements'
import { initials } from '../../lib/text'
import { InstallPrompt } from '../pwa/InstallPrompt'
import { BackupSection } from './BackupSection'
import { TrashSection } from './TrashSection'
import { TagsSection } from './TagsSection'
import { DismissedInsightsSection } from './DismissedInsightsSection'
import { RecurrenceSection } from './RecurrenceSection'
import { TemplatesSection } from './TemplatesSection'
import { ReviewsHistorySection } from './ReviewsHistorySection'
import type { ThemePreference } from '../../db/types'
import { PlannerSection } from './PlannerSection'
import { DemoDataSection } from './DemoDataSection'
import { NotificationsSection } from './NotificationsSection'
import { PomodoroSection } from './PomodoroSection'
import { AiSection } from './AiSection'
import { TelegramSection } from './TelegramSection'
import { VirtualizationSection } from './VirtualizationSection'

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
]

export function SettingsPage() {
  const { hash } = useLocation()
  // Anclas desde la paleta (`/ajustes#backup`, `/ajustes#papelera`): el contenedor con scroll es
  // <main>, así que hay que desplazar a mano en vez de fiarse del salto nativo del navegador.
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView({ block: 'start' })
  }, [hash])
  const { theme, setTheme } = useTheme()
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const unlocked = useLiveQuery(() => listAchievements(), [])
  const unlockedKeys = new Set(unlocked?.map((a) => a.key))
  const [name, setName] = useState<string | null>(null)
  const displayName = name ?? settings?.displayName ?? ''

  const commitName = () => {
    if (name !== null) updateSettings({ displayName: name.trim() || undefined })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">Preferencias</h1>
      </header>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Perfil</h2>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
            {displayName ? initials(displayName) : '?'}
          </div>
          <Input
            value={displayName}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="Tu nombre"
            className="flex-1 !px-3 !py-2"
          />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Tema</h2>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
                theme === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-text-muted hover:bg-surface-hover',
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">
          Logros{unlocked && ` (${unlocked.length}/${ACHIEVEMENTS.length})`}
        </h2>
        {unlocked === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlockedKeys.has(a.key)
              return (
                <div
                  key={a.key}
                  title={a.description}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-3 text-center',
                    isUnlocked ? 'border-accent/30 bg-accent-soft' : 'border-border opacity-40',
                  )}
                >
                  <Icon name={a.icon} size={20} strokeWidth={1.75} />
                  <span className="text-xs font-medium text-text">{a.title}</span>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <InstallPrompt />

      <PlannerSection />

      <TagsSection />

      <RecurrenceSection />

      <TemplatesSection />

      <ReviewsHistorySection />

      <DismissedInsightsSection />

      <AiSection />

      <TelegramSection />

      <VirtualizationSection />

      <PomodoroSection />

      <NotificationsSection />

      <BackupSection />

      <TrashSection />

      <DemoDataSection />
    </div>
  )
}
