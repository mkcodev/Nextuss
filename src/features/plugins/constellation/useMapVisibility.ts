import { useEffect, useState, type RefObject } from 'react'

/** El mapa no es una pantalla a pantalla completa como la Virtualización, así que sus animaciones
 * decorativas (anillos, radar, fotones) se pausan fuera de vista o con la pestaña oculta — coste
 * comedido. Compartido por `ConstellationMap2D` y `ConstellationMap3D`. */
export function useMapVisibility(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true)
  const [tabHidden, setTabHidden] = useState(document.hidden)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    const onVisibilityChange = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [ref])
  return inView && !tabHidden
}
