import { m, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import { PRESET } from '../motion'

interface CelebrationProps {
  /** Cada vez que cambia este valor (y no es null), se lanza la microcelebración una vez: p. ej. el id
   *  de la tarea recién completada o un contador. Al montar no se lanza. */
  play: string | number | null | undefined
  onDone?: () => void
  /** Lanza también si ya viene con valor al montar. Para una fila que cambia de lista justo al
   *  completarse y se vuelve a montar con la celebración en curso; quien lo usa debe poner `play` a
   *  `null` cuando acaba (si no, cada nuevo montaje la repetiría). */
  playOnMount?: boolean
  className?: string
}

/** Destello de acento sobre su contenedor más una línea que barre el borde inferior (Línea, 700 ms).
 *  Es la única microcelebración de la app: solo visual, sin sonido, y va dentro de un padre
 *  `relative`. Con movimiento reducido queda un destello corto de opacidad, sin barrido. Por defecto no
 *  se lanza al montar (ver `playOnMount`). */
export function Celebration({ play, onDone, playOnMount = false, className }: CelebrationProps) {
  const reduceMotion = useReducedMotion()
  const [seen, setSeen] = useState(playOnMount ? null : play)
  const [active, setActive] = useState<CelebrationProps['play']>(playOnMount ? (play ?? null) : null)
  // Lanzar al cambiar `play` (patrón «estado derivado de la prop anterior», sin efecto).
  if (play !== seen) {
    setSeen(play)
    setActive(play ?? null)
  }

  if (active == null) return null

  const finish = () => {
    setActive(null)
    onDone?.()
  }

  return (
    <span
      key={String(active)}
      aria-hidden="true"
      data-celebration=""
      className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]', className)}
    >
      <m.span
        className="absolute inset-0 bg-accent-soft"
        initial={{ opacity: 0 }}
        animate={PRESET.celebrateFlash.animate}
        transition={reduceMotion ? { duration: 0.14, ease: 'linear' as const } : PRESET.celebrateFlash.transition}
        onAnimationComplete={reduceMotion ? finish : undefined}
      />
      {!reduceMotion && (
        <m.span
          data-celebration-sweep=""
          className="absolute bottom-0 left-0 h-px w-[45%] bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)]"
          initial={{ x: '-100%', opacity: 0 }}
          animate={PRESET.celebrateSweep.animate}
          transition={PRESET.celebrateSweep.transition}
          onAnimationComplete={finish}
        />
      )}
    </span>
  )
}
