import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'
import { useUIStore } from './uiStore'
import { NAV_ITEMS } from './navItems'

export function LeftSidebar() {
  const collapsed = useUIStore((s) => s.leftCollapsed)

  return (
    <nav
      className={cn(
        'hidden shrink-0 flex-col gap-0.5 border-r border-border bg-bg-soft py-3 transition-[width] duration-150 md:flex',
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
              'flex h-8 items-center gap-2.5 rounded-sm px-2.5 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-0',
              isActive
                ? 'bg-surface-hover text-text'
                : 'text-text-muted hover:bg-surface-hover hover:text-text',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={16} strokeWidth={1.75} className={cn('shrink-0', isActive && 'text-accent')} />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && (
                <span className="ml-auto text-xs tabular-nums text-text-faint">
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
