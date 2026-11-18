// Features de motion que carga `MotionProvider` en un chunk aparte, después del primer pintado.
// `domMax` (y no `domAnimation`) porque hay animaciones de `layout` (avisos, listas) y `layoutId`.
export { domMax as default } from 'motion/react'
