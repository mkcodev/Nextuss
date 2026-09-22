export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermissionState(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

/** Solo se llama con contexto explícito (el usuario activa el interruptor maestro en Ajustes), nunca al arrancar la app. */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.requestPermission()
}
