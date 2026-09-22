import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const TONE_CLASSES: Record<Tone, string> = {
  info: 'border-accent/30 bg-accent-soft text-accent',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
}

const TONE_ICONS: Record<Tone, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

interface AlertProps {
  tone?: Tone
  children: ReactNode
  className?: string
}

export function Alert({ tone = 'info', children, className }: AlertProps) {
  const ToneIcon = TONE_ICONS[tone]
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', TONE_CLASSES[tone], className)}
    >
      <ToneIcon size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <div className="text-text">{children}</div>
    </div>
  )
}
