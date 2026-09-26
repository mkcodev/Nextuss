import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useToastStore } from '../lib/toastStore'
import { Card, Icon } from '../design/primitives'
import { cn } from '../lib/cn'

const VARIANT_CARD_CLASSES: Record<string, string> = {
  celebrate: 'border-accent/40 bg-accent-soft/40 p-5',
  success: 'border-success/40 bg-success/10',
  warning: 'border-warning/40 bg-warning/10',
  error: 'border-danger/40 bg-danger/10',
}

const VARIANT_ICON_CLASSES: Record<string, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-danger/15 text-danger',
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="pointer-events-auto"
          >
            <Card
              className={cn(
                'flex cursor-pointer items-start gap-3 p-4 shadow-dialog',
                toast.variant && VARIANT_CARD_CLASSES[toast.variant],
              )}
              role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
              onClick={() => {
                toast.onClick?.()
                dismiss(toast.id)
              }}
            >
              {toast.icon && (
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent',
                    toast.variant === 'celebrate' ? 'h-11 w-11' : 'h-9 w-9',
                    toast.variant && VARIANT_ICON_CLASSES[toast.variant],
                  )}
                >
                  <Icon name={toast.icon} size={toast.variant === 'celebrate' ? 21 : 17} strokeWidth={2} />
                </span>
              )}
              <div>
                <p className={cn('font-semibold text-text', toast.variant === 'celebrate' ? 'text-base' : 'text-sm')}>
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-xs text-text-muted">{toast.description}</p>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
