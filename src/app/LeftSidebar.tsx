import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { cn } from '../lib/cn'
import { SPRING, motionFor } from '../design/motion'
import { useUIStore } from './uiStore'
import { useNavItems } from './navItems'

export function LeftSidebar() {
  const collapsed = useUIStore((s) => s.leftCollapsed)
  const navItems = useNavItems()
  const reduceMotion = useReducedMotion()
  // Resaltado magnético de Línea: un único fondo que se desliza al ítem bajo el puntero (o con foco
  // de teclado). El ítem activo ya lleva su propio fondo fijo y no recibe el resaltado.
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav
      aria-label="Navegación principal"
      onPointerLeave={() => setHovered(null)}
      className={cn(
        'hidden shrink-0 flex-col gap-0.5 border-r border-border bg-bg-soft px-2 py-2.5 transition-[width] duration-(--dur-base) ease-(--ease-standard) md:flex',
        collapsed ? 'w-[60px]' : 'w-56',
      )}
    >
      {navItems.map(({ to, label, icon: Icon, end, goKey }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          viewTransition
          title={collapsed ? `${label} (g ${goKey})` : undefined}
          aria-label={collapsed ? label : undefined}
          onPointerEnter={() => setHovered(to)}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && setHovered(to)}
          onBlur={() => setHovered(null)}
          className={({ isActive }) =>
            cn(
              'group relative isolate flex h-7.5 items-center gap-[9px] rounded-sm px-2.5 text-ui font-medium transition-colors duration-(--dur-fast) ease-(--ease-standard)',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-surface-hover text-text shadow-edge' : 'text-text-muted hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              <AnimatePresence initial={false}>
                {hovered === to && !isActive && (
                  <m.span
                    aria-hidden="true"
                    layoutId="side-highlight"
                    className="absolute inset-0 -z-10 rounded-sm bg-surface-hover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={motionFor(reduceMotion, SPRING.highlight)}
                  />
                )}
              </AnimatePresence>
              <Icon size={15} strokeWidth={1.75} className={cn('shrink-0', isActive && 'text-accent-text')} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && (
                <span
                  className={cn(
                    'ml-auto font-mono text-2xs tabular-nums text-text-faint transition-opacity duration-(--dur-fast) ease-(--ease-standard) group-hover:opacity-100 group-focus-visible:opacity-100',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                >
                  g {goKey}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
