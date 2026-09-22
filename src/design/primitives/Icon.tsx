import { Circle, type LucideProps } from 'lucide-react'
import { resolveIcon } from '../icons'

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: string
}

/** Resolves an icon key from the registry; falls back to a plain circle for unknown/legacy values. */
export function Icon({ name, ...props }: IconProps) {
  const Component = resolveIcon(name) ?? Circle
  return <Component {...props} />
}
