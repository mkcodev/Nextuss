import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  Compass,
  Database,
  Download,
  FileText,
  Keyboard,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  Sun,
  Target,
} from 'lucide-react'
import { useOverlayStore } from './shortcuts/overlayStore'
import { useUIStore } from './uiStore'
import { useHabitFormStore } from '../features/habits/habitFormStore'
import { updateSettings } from '../db/repositories/settings'
import { weekKey } from '../lib/dates'
import { useGoalFormStore } from '../features/planner/goalFormStore'
import { useWeeklyReviewStore } from '../features/planner/weeklyReviewStore'
import { NAV_ITEMS } from './navItems'

// Entradas del grupo "Navegación" que no son una ruta de NAV_ITEMS (sub-tabs, anclas, etc).
const EXTRA_NAV_ITEMS = [{ to: '/planificacion?tab=objetivos', label: 'Ir a Objetivos', icon: Compass }]

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent'

export function CommandPalette() {
  const paletteOpen = useOverlayStore((s) => s.paletteOpen)
  const closePalette = useOverlayStore((s) => s.closePalette)
  const openHelp = useOverlayStore((s) => s.openHelp)
  const navigate = useNavigate()
  const toggleLeft = useUIStore((s) => s.toggleLeft)
  const toggleRight = useUIStore((s) => s.toggleRight)
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const openGoalCreate = useGoalFormStore((s) => s.openCreate)
  const openWeeklyReview = useWeeklyReviewStore((s) => s.openReview)

  const run = (fn: () => void) => {
    fn()
    closePalette()
  }

  return (
    <Command.Dialog
      open={paletteOpen}
      onOpenChange={(next: boolean) => {
        if (!next) closePalette()
      }}
      label="Paleta de comandos"
      overlayClassName="fixed inset-0 z-palette bg-black/40 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[18%] z-palette-content w-full max-w-lg -translate-x-1/2 px-4"
      className="overflow-hidden rounded-2xl border border-border bg-bg-soft shadow-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5">
        <Search size={15} strokeWidth={1.75} className="shrink-0 text-text-faint" />
        <Command.Input
          autoFocus
          placeholder="Escribe un comando o busca…"
          className="w-full bg-transparent py-3.5 text-sm text-text outline-none placeholder:text-text-faint"
        />
      </div>

      <Command.List className="max-h-80 overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-faint">
        <Command.Empty className="px-3 py-6 text-center text-sm text-text-faint">
          Sin resultados.
        </Command.Empty>

        <Command.Group heading="Navegación">
          {NAV_ITEMS.map(({ to, label, icon: Icon, paletteLabel }) => (
            <Command.Item
              key={to}
              onSelect={() => run(() => navigate(to))}
              className={ITEM_CLASS}
            >
              <Icon size={15} strokeWidth={1.75} /> {paletteLabel ?? `Ir a ${label}`}
            </Command.Item>
          ))}
          {EXTRA_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <Command.Item
              key={to}
              onSelect={() => run(() => navigate(to))}
              className={ITEM_CLASS}
            >
              <Icon size={15} strokeWidth={1.75} /> {label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Acciones">
          <Command.Item
            onSelect={() => run(openCreate)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Plus size={15} strokeWidth={1.75} /> Crear hábito
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => openGoalCreate({ period: 'week', periodKey: weekKey() }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Target size={15} strokeWidth={1.75} /> Crear objetivo
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => openWeeklyReview(weekKey()))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <ClipboardCheck size={15} strokeWidth={1.75} /> Revisión semanal
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Informes">
          <Command.Item
            onSelect={() => run(() => navigate('/estadisticas?tab=informes'))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <FileText size={15} strokeWidth={1.75} /> Informe semanal
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => navigate('/estadisticas?tab=informes'))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Download size={15} strokeWidth={1.75} /> Exportar datos
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => navigate('/estadisticas?tab=informes'))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Database size={15} strokeWidth={1.75} /> Backup
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Vista">
          <Command.Item
            onSelect={() => run(toggleLeft)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <PanelLeft size={15} strokeWidth={1.75} /> Colapsar/expandir navegación
          </Command.Item>
          <Command.Item
            onSelect={() => run(toggleRight)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <PanelRight size={15} strokeWidth={1.75} /> Mostrar/ocultar panel
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Tema">
          <Command.Item
            onSelect={() => run(() => updateSettings({ theme: 'light' }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Sun size={15} strokeWidth={1.75} /> Tema claro
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => updateSettings({ theme: 'dark' }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Moon size={15} strokeWidth={1.75} /> Tema oscuro
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => updateSettings({ theme: 'system' }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Monitor size={15} strokeWidth={1.75} /> Tema del sistema
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Ayuda">
          <Command.Item
            onSelect={() => run(openHelp)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Keyboard size={15} strokeWidth={1.75} /> Ver atajos de teclado
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
