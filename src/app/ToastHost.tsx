import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useToastStore } from '../lib/toastStore'
import { Icon } from '../design/primitives'
import { PRESET, motionFor } from '../design/motion'
import { cn } from '../lib/cn'

// Los avisos de Línea llevan los colores invertidos (claro sobre oscuro y al revés), así que la
// variante ya no pinta el fondo: se nota por el icono, por el rol (alert/status) y, en celebrate,
// por el tamaño y un anillo de acento.

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      // En móvil se apila por encima de la barra de navegación inferior (y del indicador de inicio de iOS).
      className="pointer-events-none fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-toast flex flex-col gap-2 md:inset-x-auto md:bottom-6 md:left-1/2 md:w-max md:max-w-[min(28rem,calc(100vw-2rem))] md:-translate-x-1/2 md:items-center"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            layout="position"
            initial={reduceMotion ? { opacity: 0 } : PRESET.toast.initial}
            animate={PRESET.toast.animate}
            exit={reduceMotion ? { opacity: 0 } : PRESET.toast.exit}
            transition={motionFor(reduceMotion, PRESET.toast.transition)}
            className="pointer-events-auto w-full md:w-auto"
          >
            <div
              className={cn(
                'flex items-center gap-3 rounded-md bg-toast px-3.5 py-2.5 text-ui font-medium text-on-toast shadow-dialog',
                toast.variant === 'celebrate' && 'p-5 ring-1 ring-accent/60',
              )}
              role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
            >
              {toast.icon && (
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,currentColor_12%,transparent)]',
                    toast.variant === 'celebrate' ? 'h-11 w-11' : 'h-8 w-8',
                  )}
                >
                  <Icon name={toast.icon} size={toast.variant === 'celebrate' ? 21 : 16} strokeWidth={2} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn('text-pretty', toast.variant === 'celebrate' ? 'text-base font-semibold' : 'font-medium')}>
                  {toast.title}
                </p>
                {toast.description && <p className="text-xs font-normal opacity-70">{toast.description}</p>}
              </div>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick()
                    dismiss(toast.id)
                  }}
                  className="shrink-0 rounded-sm bg-[color-mix(in_srgb,currentColor_14%,transparent)] px-2 py-1 text-ui font-semibold transition-colors duration-(--dur-fast) hover:bg-[color-mix(in_srgb,currentColor_22%,transparent)]"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar aviso"
                className="-mr-1 shrink-0 rounded-sm p-1 opacity-60 transition-opacity duration-(--dur-fast) hover:opacity-100"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
