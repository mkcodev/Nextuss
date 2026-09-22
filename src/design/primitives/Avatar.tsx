import { User } from 'lucide-react'
import { cn } from '../../lib/cn'

interface AvatarProps {
  name?: string
  initials?: string
  size?: number
  className?: string
}

export function Avatar({ name, initials, size = 32, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      role="img"
      aria-label={name || 'Perfil'}
    >
      {initials || <User size={size * 0.5} strokeWidth={1.75} />}
    </span>
  )
}
