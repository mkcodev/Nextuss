import { useEffect } from 'react'
import { db } from '../../db/schema'
import { useToastStore } from '../../lib/toastStore'
import { downloadFullBackup, reauthorizeAndBackup, runAutoBackupIfDue, shouldRemindBackup } from './autoBackup'

/** Una vez por arranque: copia automática si toca y, si no hay copia reciente, un recordatorio. */
export function useBackupGuard() {
  useEffect(() => {
    let cancelled = false
    const push = useToastStore.getState().push

    void (async () => {
      const outcome = await runAutoBackupIfDue()
      if (cancelled || outcome === 'done') return

      if (outcome === 'needs-permission') {
        push({
          title: 'Copia automática en pausa',
          description: 'El navegador pide permiso otra vez para escribir en la carpeta de copias.',
          icon: 'shield',
          variant: 'warning',
          sticky: true,
          action: {
            label: 'Permitir',
            onClick: () =>
              void reauthorizeAndBackup().then((ok) =>
                push(ok ? { title: 'Copia de seguridad guardada', variant: 'success' } : { title: 'Permiso no concedido', variant: 'warning' }),
              ),
          },
        })
        return
      }

      const hasData = (await db.tasks.count()) + (await db.habits.count()) > 0
      const days = await shouldRemindBackup(hasData)
      if (cancelled || days === null) return
      push({
        title: days < 0 ? 'Aún no tienes copia de seguridad' : `${days} días sin copia de seguridad`,
        description: 'Tus datos solo viven en este navegador. Una copia tarda un segundo.',
        icon: 'shield',
        variant: 'warning',
        sticky: true,
        action: {
          label: 'Descargar copia',
          onClick: () => void downloadFullBackup().then(() => push({ title: 'Copia de seguridad descargada', variant: 'success' })),
        },
      })
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
