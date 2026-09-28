// Motores globales de cada plugin. Un hook no puede llamarse condicionalmente, así que cada motor
// vive en un componente vacío que solo se monta con su plugin activo: desactivar = el motor se para.
import { useFocusTimerEngine } from '../focus/useFocusTimerEngine'
import { useRoutinePlayerEngine } from '../routines/useRoutinePlayerEngine'
import { RoutinePlayer } from '../routines/RoutinePlayer'
import { useTelegramPoller } from '../telegram/useTelegramPoller'
import { useTelegramWorkerSync } from '../telegram/useTelegramWorkerSync'
import { usePluginEnabled } from './pluginsStore'

function FocusEngine() {
  useFocusTimerEngine()
  return null
}

function RoutinesEngine() {
  useRoutinePlayerEngine()
  return <RoutinePlayer />
}

function TelegramEngine() {
  useTelegramPoller()
  useTelegramWorkerSync()
  return null
}

export function PluginEngines() {
  const focus = usePluginEnabled('focus')
  const routines = usePluginEnabled('routines')
  const telegram = usePluginEnabled('telegram')
  return (
    <>
      {focus && <FocusEngine />}
      {routines && <RoutinesEngine />}
      {telegram && <TelegramEngine />}
    </>
  )
}
