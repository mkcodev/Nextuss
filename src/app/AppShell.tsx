import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { LeftSidebar } from './LeftSidebar'
import { MobileNav } from './MobileNav'
import { RightDock } from './dock/RightDock'
import { lazyNamed } from './lazy'
import { MountOnFirstOpen } from './MountOnFirstOpen'
import { useOverlayStore } from './shortcuts/overlayStore'
import { Skeleton } from '../design/primitives'
import { ShortcutsHelpModal } from './ShortcutsHelpModal'
import { ToastHost } from './ToastHost'
import { useGlobalShortcuts } from './shortcuts/useGlobalShortcuts'
import { usePwaShortcutActions } from './shortcuts/usePwaShortcutActions'
import { useServiceWorker } from '../features/pwa/useServiceWorker'
import { useNotificationScheduler } from '../features/notifications/useNotificationScheduler'
import { useFocusTimerEngine } from '../features/focus/useFocusTimerEngine'
import { useRoutinePlayerEngine } from '../features/routines/useRoutinePlayerEngine'
import { RoutineForm } from '../features/routines/RoutineForm'
import { useRoutineFormStore } from '../features/routines/routineFormStore'
import { RoutinePlayer } from '../features/routines/RoutinePlayer'
import { useTelegramPoller } from '../features/telegram/useTelegramPoller'
import { useTelegramWorkerSync } from '../features/telegram/useTelegramWorkerSync'
import { useTheme } from '../design/useTheme'
import { HabitForm } from '../features/habits/HabitForm'
import { useHabitFormStore } from '../features/habits/habitFormStore'
import { TaskForm } from '../features/tasks/TaskForm'
import { useTaskFormStore } from '../features/tasks/taskFormStore'
import { QuickAddDialog } from '../features/tasks/QuickAddDialog'
import { GoalForm } from '../features/planner/GoalForm'
import { useGoalFormStore } from '../features/planner/goalFormStore'
import { ProjectForm } from '../features/projects/ProjectForm'
import { useProjectFormStore } from '../features/projects/projectFormStore'
import { LogTimeDialog } from '../features/tasks/LogTimeDialog'
import { useLogTimeStore } from '../features/tasks/logTimeStore'
import { TemplatePickerDialog } from '../features/templates/TemplatePickerDialog'
import { useTemplatePickerStore } from '../features/templates/templatePickerStore'
import { WeeklyReviewDialog } from '../features/planner/WeeklyReviewDialog'
import { useTaskBreakdownStore } from '../features/ai/taskBreakdownStore'
import { useAiSuggestStore } from '../features/ai/aiSuggestStore'
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow'
import { DayStartFlow } from '../features/rituals/DayStartFlow'
import { DayCloseFlow } from '../features/rituals/DayCloseFlow'
import { useBackupGuard } from '../features/backup/useBackupGuard'
import { usePluginsSync } from '../features/plugins/pluginsStore'

const CommandPalette = lazyNamed(() => import('./CommandPalette'), 'CommandPalette')
const TaskBreakdownDialog = lazyNamed(() => import('../features/ai/TaskBreakdownDialog'), 'TaskBreakdownDialog')
const AiSuggestDialog = lazyNamed(() => import('../features/ai/AiSuggestDialog'), 'AiSuggestDialog')

function RouteFallback() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-8" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export function AppShell() {
  usePluginsSync()
  useGlobalShortcuts()
  usePwaShortcutActions()
  useServiceWorker()
  useNotificationScheduler()
  useFocusTimerEngine()
  useRoutinePlayerEngine()
  useTelegramPoller()
  useBackupGuard()
  useTelegramWorkerSync()
  useTheme()
  const formHabitNonce = useHabitFormStore((s) => s.nonce)
  const formTaskNonce = useTaskFormStore((s) => s.nonce)
  const formGoalNonce = useGoalFormStore((s) => s.nonce)
  const formProjectNonce = useProjectFormStore((s) => s.nonce)
  const formRoutineNonce = useRoutineFormStore((s) => s.nonce)
  const logTimeNonce = useLogTimeStore((s) => s.nonce)
  const templatePickerNonce = useTemplatePickerStore((s) => s.nonce)
  const paletteOpen = useOverlayStore((s) => s.paletteOpen)
  const breakdownOpen = useTaskBreakdownStore((s) => s.open)
  const aiSuggestOpen = useAiSuggestStore((s) => s.open)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] focus:outline-none md:pb-0"
        >
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>

        <RightDock />
      </div>

      <MobileNav />

      <MountOnFirstOpen open={paletteOpen}>
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      </MountOnFirstOpen>
      <ShortcutsHelpModal />
      <HabitForm key={`habit-${formHabitNonce}`} />
      <TaskForm key={`task-${formTaskNonce}`} />
      <GoalForm key={`goal-${formGoalNonce}`} />
      <ProjectForm key={`project-${formProjectNonce}`} />
      <RoutineForm key={`routine-${formRoutineNonce}`} />
      <LogTimeDialog key={`logtime-${logTimeNonce}`} />
      <TemplatePickerDialog key={`template-${templatePickerNonce}`} />
      <QuickAddDialog />
      <WeeklyReviewDialog />
      <MountOnFirstOpen open={breakdownOpen}>
        <Suspense fallback={null}>
          <TaskBreakdownDialog />
        </Suspense>
      </MountOnFirstOpen>
      <MountOnFirstOpen open={aiSuggestOpen}>
        <Suspense fallback={null}>
          <AiSuggestDialog />
        </Suspense>
      </MountOnFirstOpen>
      <OnboardingFlow />
      <DayStartFlow />
      <DayCloseFlow />
      <RoutinePlayer />
      <ToastHost />
    </div>
  )
}
