import type { ButtonHTMLAttributes, Ref } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  /** sm: 28px (barras de herramientas, fichas). md: 32px (formularios, acciones principales). */
  size?: Size
  /** Muestra un indicador y bloquea el botón mientras se guarda (evita dobles envíos). */
  loading?: boolean
  /** React 19: `ref` llega como prop y se pasa al <button>. */
  ref?: Ref<HTMLButtonElement>
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'bg-surface border border-border text-text hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-hover',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[13px] gap-1.5',
  md: 'h-8 px-3 text-sm gap-2',
}

export function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, onClick, ...props }: ButtonProps) {
  return (
    <button
      // Mientras guarda no se usa `disabled`: eso le quitaría el foco (se iría a <body>). Se bloquea el clic.
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (loading) {
          e.preventDefault()
          return
        }
        onClick?.(e)
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-sm font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none aria-busy:cursor-progress',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
