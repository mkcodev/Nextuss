import { NavLink } from 'react-router-dom'
import { LayoutGroup, m, useReducedMotion } from 'motion/react'
import { LayoutPanelTop, Plus } from 'lucide-react'
import { cn } from '../lib/cn'
import { SPRING, motionFor } from '../design/motion'
import { useNavItems } from './navItems'
import { useUIStore } from './uiStore'
import { useQuickAddStore } from '../features/tasks/quickAddStore'

// En el móvil caben 4 destinos + Crear + Panel. Tareas entra (es la lista principal); Estadísticas,
// Proyectos y Ajustes quedan en la paleta y el menú del avatar — una barra de 8 en un teléfono es
// "técnicamente alcanzable", no usable. Retos también va al avatar: revisar tras R3, cuando el resumen
// de Hoy enlace a /retos; si se echa en falta, reconsiderar la barra.
const MOBILE_EXCLUDED = new Set(['/ajustes', '/proyectos', '/estadisticas', '/rutinas', '/plugins', '/retos'])

export function MobileNav() {
  const openMobileDock = useUIStore((s) => s.openMobileDock)
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)
  const navItems = useNavItems().filter((item) => !MOBILE_EXCLUDED.has(item.to))
  const reduceMotion = useReducedMotion()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-mobile-nav flex justify-around border-t border-border bg-bg-soft md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <LayoutGroup id="mobile-nav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            viewTransition
            className={({ isActive }) =>
              cn(
                'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs font-medium transition-colors duration-(--dur-fast) ease-(--ease-standard)',
                isActive ? 'text-accent-text' : 'text-text-muted hover:text-text',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Píldora de 48×2 px que se desliza de un destino al siguiente. */}
                {isActive && (
                  <m.span
                    aria-hidden="true"
                    layoutId="mobile-nav-pill"
                    className="absolute top-0 h-0.5 w-12 rounded-full bg-accent"
                    transition={motionFor(reduceMotion, SPRING.ui)}
                  />
                )}
                <Icon size={18} strokeWidth={1.75} />
                <span className="max-w-full truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </LayoutGroup>

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
