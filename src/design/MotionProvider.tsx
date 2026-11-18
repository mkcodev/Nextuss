import { LazyMotion } from 'motion/react'
import type { ReactNode } from 'react'

const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default)

/** Carga las features de motion en diferido: el JS inicial solo lleva los componentes `m.*`, y las
 *  animaciones se activan en cuanto llega el chunk. `strict` hace fallar cualquier `motion.*`, que
 *  metería el motor completo en el chunk inicial. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
