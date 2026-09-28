// Puente para navegar desde fuera de React (lanzadores). AppShell registra el `navigate` del router.
type Navigate = (to: string) => void

let navigateFn: Navigate | null = null

export function setNavigator(fn: Navigate | null): void {
  navigateFn = fn
}

export function navigateTo(to: string): boolean {
  if (!navigateFn) return false
  navigateFn(to)
  return true
}
