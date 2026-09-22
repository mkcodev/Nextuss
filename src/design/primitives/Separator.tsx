import { cn } from '../../lib/cn'

export function Separator({ className }: { className?: string }) {
  return <div role="separator" aria-orientation="horizontal" className={cn('h-px w-full bg-border', className)} />
}
