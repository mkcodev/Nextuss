import { useEffect, useRef } from 'react'

/** Tecla `x` = «marcar hoy» (alternar). Un `keydown` propio de /retos, al estilo de `TasksPage`: ignora los
 *  campos de texto, los menús abiertos, las teclas con modificador y lo que otro ya gestionó.
 *
 *  - `page`: la lista; no actúa si hay cualquier diálogo o hoja abiertos.
 *  - `sheet`: la ficha de un reto; no actúa si hay algún diálogo ENCIMA de ella (p. ej. el de abandonar). */
export function useMarkShortcut(onMark: () => void, scope: 'page' | 'sheet') {
  const latest = useRef(onMark)
  useEffect(() => {
    latest.current = onMark
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'x' || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (document.querySelector('[role=menu]')) return
      const dialogs = document.querySelectorAll('[role=dialog]').length
      if (dialogs > (scope === 'page' ? 0 : 1)) return
      e.preventDefault()
      latest.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scope])
}
