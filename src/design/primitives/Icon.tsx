import { createElement } from 'react'
import { Circle, type LucideProps } from 'lucide-react'
import { resolveIcon } from '../icons'

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: string
}

/** Resolves an icon key from the registry; falls back to a plain circle for unknown/legacy values. */
export function Icon({ name, ...props }: IconProps) {
  // Registry icons are module-level components, so createElement reuses them across renders.
  return createElement(resolveIcon(name) ?? Circle, props)
}
