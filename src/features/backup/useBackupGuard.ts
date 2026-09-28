import { useEffect } from 'react'
import { db } from '../../db/schema'
import { useToastStore } from '../../lib/toastStore'
import {
  backupReminderContent,
  chooseBackupDir,
  downloadFullBackup,
  isAutoBackupSupported,
  reauthorizeAndBackup,
  runAutoBackupIfDue,
  shouldRemindBackup,
} from './autoBackup'

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
      const content = backupReminderContent(days, outcome === 'no-dir' && isAutoBackupSupported())
      push({
        title: content.title,
        description: content.description,
        icon: 'shield',
        variant: 'warning',
        sticky: true,
        action:
          content.action === 'choose-folder'
            ? { label: 'Elegir carpeta', onClick: () => void chooseFolder() }
            : {
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

async function chooseFolder() {
  const push = useToastStore.getState().push
  try {
    const name = await chooseBackupDir()
    push({ title: 'Copia automática activada', description: `Carpeta: ${name}`, variant: 'success' })
  } catch (err) {
    // Cerrar el selector no es un error; cualquier otro fallo sí se avisa.
    if (!(err instanceof DOMException && err.name === 'AbortError')) {
      push({ title: 'No se pudo usar esa carpeta', variant: 'error' })
    }
  }
}
