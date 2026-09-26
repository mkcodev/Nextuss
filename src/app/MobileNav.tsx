import { NavLink } from 'react-router-dom'
import { LayoutPanelTop, Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { NAV_ITEMS } from './navItems'
import { useUIStore } from './uiStore'
import { useQuickAddStore } from '../features/tasks/quickAddStore'

// En el móvil caben 4 destinos + Crear + Panel. Tareas entra (es la lista principal); Estadísticas,
// Proyectos y Ajustes quedan en la paleta y el menú del avatar — una barra de 8 en un teléfono es
// "técnicamente alcanzable", no usable.
const MOBILE_EXCLUDED = new Set(['/ajustes', '/proyectos', '/estadisticas'])
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
              'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-accent' : 'text-text-muted hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-accent" />}
              <Icon size={18} strokeWidth={1.75} />
              <span className="max-w-full truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}

      <button
        type="button"
        onClick={() => openQuickAdd()}
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
      >
        <Plus size={18} strokeWidth={1.75} />
        <span>Crear</span>
      </button>

      <button
        type="button"
        onClick={openMobileDock}
        className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
      >
        <LayoutPanelTop size={18} strokeWidth={1.75} />
        <span>Panel</span>
      </button>
    </nav>
  )
}
