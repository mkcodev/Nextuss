import { NavLink } from 'react-router-dom'
import { LayoutPanelTop, Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { NAV_ITEMS } from './navItems'
import { useUIStore } from './uiStore'
import { useQuickAddStore } from '../features/tasks/quickAddStore'

// Ajustes is left out (reachable via the avatar menu and the palette); Tareas and Proyectos are left
// out too (both reachable via the palette) to leave room for the two action buttons every phone user
// actually needs: create, and the dock — an 8-tab bottom bar on a phone-width screen is "technically
// reachable", not "usable".
const MOBILE_EXCLUDED = new Set(['/ajustes', '/proyectos', '/tareas'])
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => !MOBILE_EXCLUDED.has(item.to))

export function MobileNav() {
  const openMobileDock = useUIStore((s) => s.openMobileDock)
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-mobile-nav flex justify-around border-t border-border bg-bg-soft md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-accent' : 'text-text-faint hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-accent" />}
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}

      <button
        onClick={() => openQuickAdd()}
        className="flex flex-1 flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium text-text-faint transition-colors hover:text-text"
      >
        <Plus size={18} strokeWidth={1.75} />
        <span>Crear</span>
      </button>

      <button
        onClick={openMobileDock}
        className="flex flex-1 flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium text-text-faint transition-colors hover:text-text"
      >
        <LayoutPanelTop size={18} strokeWidth={1.75} />
        <span>Panel</span>
      </button>
    </nav>
  )
}
