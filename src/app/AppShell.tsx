import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { LeftSidebar } from './LeftSidebar'
import { MobileNav } from './MobileNav'
import { RightDock } from './dock/RightDock'
import { CommandPalette } from './CommandPalette'
import { ShortcutsHelpModal } from './ShortcutsHelpModal'
import { ToastHost } from './ToastHost'
import { useGlobalShortcuts } from './shortcuts/useGlobalShortcuts'
import { usePwaShortcutActions } from './shortcuts/usePwaShortcutActions'
import { useServiceWorker } from '../features/pwa/useServiceWorker'
import { useNotificationScheduler } from '../features/notifications/useNotificationScheduler'
import { useFocusTimerEngine } from '../features/focus/useFocusTimerEngine'
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
import { WeeklyReviewDialog } from '../features/planner/WeeklyReviewDialog'
import { TaskBreakdownDialog } from '../features/ai/TaskBreakdownDialog'
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow'

export function AppShell() {
  useGlobalShortcuts()
  usePwaShortcutActions()
  useServiceWorker()
  useNotificationScheduler()
  useFocusTimerEngine()
  useTelegramPoller()
  useTelegramWorkerSync()
  useTheme()
  const formHabitNonce = useHabitFormStore((s) => s.nonce)
  const formTaskNonce = useTaskFormStore((s) => s.nonce)
  const formGoalNonce = useGoalFormStore((s) => s.nonce)

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
          <Outlet />
        </main>

        <RightDock />
      </div>

      <MobileNav />

      <CommandPalette />
      <ShortcutsHelpModal />
      <HabitForm key={`habit-${formHabitNonce}`} />
      <TaskForm key={`task-${formTaskNonce}`} />
      <GoalForm key={`goal-${formGoalNonce}`} />
      <QuickAddDialog />
      <WeeklyReviewDialog />
      <TaskBreakdownDialog />
      <OnboardingFlow />
      <ToastHost />
    </div>
  )
}
