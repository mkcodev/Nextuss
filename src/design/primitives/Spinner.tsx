import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin', className)} aria-hidden="true" />
}
