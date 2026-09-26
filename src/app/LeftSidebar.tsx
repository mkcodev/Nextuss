import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useUIStore } from './uiStore'
import { NAV_ITEMS } from './navItems'

export function LeftSidebar() {
  const collapsed = useUIStore((s) => s.leftCollapsed)

  return (
    <nav
      className={cn(
        'hidden shrink-0 flex-col gap-0.5 border-r border-border py-3 transition-[width] duration-150 md:flex',
        collapsed ? 'w-[60px] px-2' : 'w-56 px-3',
      )}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, end, goKey }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={collapsed ? `${label} (g ${goKey})` : undefined}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-0',
              isActive
                ? 'bg-accent-soft text-accent'
                : 'text-text-faint hover:bg-surface-hover hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
              )}
              <Icon size={18} strokeWidth={1.75} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && (
                <span className="ml-auto text-xs tabular-nums text-text-faint/70">
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
