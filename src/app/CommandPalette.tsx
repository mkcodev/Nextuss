import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  Compass,
  Database,
  Download,
  FileText,
  FolderKanban,
  Keyboard,
  LayoutTemplate,
  ListTodo,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  Play,
  Plus,
  Repeat,
  Search,
  Settings2,
  Sun,
  Target,
  Trash2,
} from 'lucide-react'
import { useOverlayStore } from './shortcuts/overlayStore'
import { useUIStore } from './uiStore'
import { useHabitFormStore } from '../features/habits/habitFormStore'
import { useQuickAddStore } from '../features/tasks/quickAddStore'
import { updateSettings } from '../db/repositories/settings'
import { getTask } from '../db/repositories/tasks'
import { getHabit } from '../db/repositories/habits'
import { getGoal } from '../db/repositories/goals'
import { weekKey } from '../lib/dates'
import { useTaskFormStore } from '../features/tasks/taskFormStore'
import { useGoalFormStore } from '../features/planner/goalFormStore'
import { useWeeklyReviewStore } from '../features/planner/weeklyReviewStore'
import { useProjectFormStore } from '../features/projects/projectFormStore'
import { useRoutineFormStore } from '../features/routines/routineFormStore'
import { startRoutine } from '../features/routines/actions'
import { listRoutines } from '../db/repositories/routines'
import { useTemplatePickerStore } from '../features/templates/templatePickerStore'
import { searchIndex, type SearchDoc } from '../features/search/searchIndex'
import { selectNav, useNavItems } from './navItems'
import { useEnabledPlugins } from '../features/plugins/pluginsStore'
import { getPlugin } from '../features/plugins/registry'
import { searchSettings } from '../features/plugins/settings/searchSettings'
import type { PluginId } from '../features/plugins/types'

const SEARCH_ICON: Record<SearchDoc['type'], typeof ListTodo> = {
  task: ListTodo,
  habit: Repeat,
  goal: Target,
  project: FolderKanban,
}

// Entradas del grupo "Navegación" que no son una ruta de NAV_ITEMS (sub-tabs, anclas, etc).
const EXTRA_NAV_ITEMS: { to: string; label: string; icon: typeof Compass; pluginId: PluginId }[] = [
  { to: '/planificacion?tab=objetivos', label: 'Ir a Objetivos', icon: Compass, pluginId: 'planning' },
]

// Resultados de búsqueda de un plugin activable (tareas, objetivos y proyectos son núcleo).
const SEARCH_PLUGIN: Partial<Record<SearchDoc['type'], PluginId>> = { habit: 'habits' }

const ITEM_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent'

export function CommandPalette() {
  const paletteOpen = useOverlayStore((s) => s.paletteOpen)
  const closePalette = useOverlayStore((s) => s.closePalette)
  const openHelp = useOverlayStore((s) => s.openHelp)
  const navigate = useNavigate()
  const navItems = useNavItems()
  const enabled = useEnabledPlugins()
  const on = (id: PluginId) => enabled.has(id)
  const toggleLeft = useUIStore((s) => s.toggleLeft)
  const toggleRight = useUIStore((s) => s.toggleRight)
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const openHabitEdit = useHabitFormStore((s) => s.openEdit)
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)
  const openTaskEdit = useTaskFormStore((s) => s.openEdit)
  const openGoalCreate = useGoalFormStore((s) => s.openCreate)
  const openGoalEdit = useGoalFormStore((s) => s.openEdit)
  const openWeeklyReview = useWeeklyReviewStore((s) => s.openReview)
  const openProjectCreate = useProjectFormStore((s) => s.openCreate)
  const openRoutineCreate = useRoutineFormStore((s) => s.openCreate)
  const routines = useLiveQuery(() => listRoutines(), []) ?? []
  const openTemplatePicker = useTemplatePickerStore((s) => s.openFor)

  const [query, setQuery] = useState('')
  const results = useMemo(
    () =>
      (query.trim() ? searchIndex.search(query) : []).filter((doc) => {
        const pluginId = SEARCH_PLUGIN[doc.type]
        return !pluginId || enabled.has(pluginId)
      }),
    [query, enabled],
  )
  // Comandos «Ajuste: …» generados desde el esquema (#98 P6) — solo con texto, y solo de plugins activos
  // (igual que el resto de comandos de plugin: si está apagado, desaparece de la paleta).
  const settingsResults = useMemo(
    () => searchSettings(query).filter((m) => enabled.has(m.pluginId) || getPlugin(m.pluginId).core),
    [query, enabled],
  )

  useEffect(() => {
    if (paletteOpen) void searchIndex.ensureBuilt()
  }, [paletteOpen])

  const run = (fn: () => void) => {
    fn()
    closePalette()
  }

  const openResult = async (doc: SearchDoc) => {
    if (doc.type === 'task') {
      const task = await getTask(doc.id)
      if (task) openTaskEdit(task)
    } else if (doc.type === 'habit') {
      const habit = await getHabit(doc.id)
      if (habit) openHabitEdit(habit)
    } else if (doc.type === 'goal') {
      const goal = await getGoal(doc.id)
      if (goal) openGoalEdit(goal)
    } else {
      navigate(`/proyectos/${doc.id}`)
    }
  }

  return (
    <Command.Dialog
      open={paletteOpen}
      onOpenChange={(next: boolean) => {
        if (!next) closePalette()
      }}
      label="Paleta de comandos"
      overlayClassName="fixed inset-0 z-palette bg-scrim"
      contentClassName="fixed left-1/2 top-[18%] z-palette-content w-full max-w-lg -translate-x-1/2 px-4"
      className="overflow-hidden rounded-lg border border-border bg-bg-soft shadow-card"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5">
        <Search size={15} strokeWidth={1.75} className="shrink-0 text-text-faint" />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Escribe un comando o busca…"
          className="w-full bg-transparent py-3.5 text-sm text-text outline-none placeholder:text-text-faint"
        />
      </div>

      <Command.List className="max-h-80 overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-faint">
        <Command.Empty className="px-3 py-6 text-center text-sm text-text-faint">
          Sin resultados.
        </Command.Empty>

        {results.length > 0 && (
          <Command.Group heading="Resultados">
            {results.map((doc) => {
              const Icon = SEARCH_ICON[doc.type]
              return (
                <Command.Item
                  key={`${doc.type}:${doc.id}`}
                  value={`resultado ${doc.title}`}
                  onSelect={() => run(() => void openResult(doc))}
                  className={ITEM_CLASS}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                  {doc.subtitle && <span className="shrink-0 text-xs text-text-faint">{doc.subtitle}</span>}
                </Command.Item>
              )
            })}
          </Command.Group>
        )}

        {settingsResults.length > 0 && (
          <Command.Group heading="Ajustes">
            {settingsResults.map((m) => (
              <Command.Item
                key={`${m.pluginId}-${m.anchorId}`}
                value={`ajuste ${m.pluginName} ${m.label}`}
                onSelect={() => run(() => navigate(`/plugins/${m.pluginId}#${m.anchorId}`))}
                className={ITEM_CLASS}
              >
                <Settings2 size={15} strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">
                  Ajuste: {m.pluginName} › {m.label}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Navegación">
          {navItems.map(({ to, label, icon: Icon, paletteLabel }) => (
            <Command.Item
              key={to}
              onSelect={() => run(() => navigate(to))}
              className={ITEM_CLASS}
            >
              <Icon size={15} strokeWidth={1.75} /> {paletteLabel ?? `Ir a ${label}`}
            </Command.Item>
          ))}
          {selectNav(EXTRA_NAV_ITEMS, enabled).map(({ to, label, icon: Icon }) => (
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
          <Command.Item onSelect={() => run(openQuickAdd)} className={ITEM_CLASS}>
            <Plus size={15} strokeWidth={1.75} /> Crear tarea
          </Command.Item>
          {on('habits') && (
            <Command.Item onSelect={() => run(openCreate)} className={ITEM_CLASS}>
              <Plus size={15} strokeWidth={1.75} /> Crear hábito
            </Command.Item>
          )}
          <Command.Item
            onSelect={() => run(() => openGoalCreate({ period: 'week', periodKey: weekKey() }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Target size={15} strokeWidth={1.75} /> Crear objetivo
          </Command.Item>
          <Command.Item
            onSelect={() => run(openProjectCreate)}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <FolderKanban size={15} strokeWidth={1.75} /> Crear proyecto
          </Command.Item>
          {on('routines') && (
            <Command.Item onSelect={() => run(openRoutineCreate)} className={ITEM_CLASS}>
              <Repeat size={15} strokeWidth={1.75} /> Crear rutina
            </Command.Item>
          )}
          {on('routines') && routines.map((r) => (
            <Command.Item
              key={`routine-${r.id}`}
              value={`Empezar rutina ${r.name}`}
              onSelect={() => run(() => void startRoutine(r))}
              className={ITEM_CLASS}
            >
              <Play size={15} strokeWidth={1.75} /> Empezar rutina: {r.name}
            </Command.Item>
          ))}
          <Command.Item onSelect={() => run(() => openTemplatePicker('task'))} className={ITEM_CLASS}>
            <LayoutTemplate size={15} strokeWidth={1.75} /> Tarea desde plantilla
          </Command.Item>
          <Command.Item onSelect={() => run(() => openTemplatePicker('project'))} className={ITEM_CLASS}>
            <LayoutTemplate size={15} strokeWidth={1.75} /> Proyecto desde plantilla
          </Command.Item>
          {on('weeklyReview') && (
            <Command.Item onSelect={() => run(() => openWeeklyReview(weekKey()))} className={ITEM_CLASS}>
              <ClipboardCheck size={15} strokeWidth={1.75} /> Revisión semanal
            </Command.Item>
          )}
        </Command.Group>

        <Command.Group heading="Informes">
          {on('stats') && (
            <>
              <Command.Item onSelect={() => run(() => navigate('/estadisticas?tab=informes'))} className={ITEM_CLASS}>
                <FileText size={15} strokeWidth={1.75} /> Informe semanal
              </Command.Item>
              <Command.Item onSelect={() => run(() => navigate('/estadisticas?tab=informes'))} className={ITEM_CLASS}>
                <Download size={15} strokeWidth={1.75} /> Exportar datos
              </Command.Item>
            </>
          )}
          <Command.Item
            onSelect={() => run(() => navigate('/ajustes#backup'))}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Database size={15} strokeWidth={1.75} /> Backup
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => navigate('/ajustes#papelera'))}
            className={ITEM_CLASS}
          >
            <Trash2 size={15} strokeWidth={1.75} /> Papelera
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Vista">
          <Command.Item
            onSelect={() => run(toggleLeft)}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <PanelLeft size={15} strokeWidth={1.75} /> Colapsar/expandir navegación
          </Command.Item>
          <Command.Item
            onSelect={() => run(toggleRight)}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <PanelRight size={15} strokeWidth={1.75} /> Mostrar/ocultar panel
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Tema">
          <Command.Item
            onSelect={() => run(() => updateSettings({ theme: 'light' }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Sun size={15} strokeWidth={1.75} /> Tema claro
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => updateSettings({ theme: 'dark' }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Moon size={15} strokeWidth={1.75} /> Tema oscuro
          </Command.Item>
          <Command.Item
            onSelect={() => run(() => updateSettings({ theme: 'system' }))}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Monitor size={15} strokeWidth={1.75} /> Tema del sistema
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Ayuda">
          <Command.Item
            onSelect={() => run(openHelp)}
            className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent"
          >
            <Keyboard size={15} strokeWidth={1.75} /> Ver atajos de teclado
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
