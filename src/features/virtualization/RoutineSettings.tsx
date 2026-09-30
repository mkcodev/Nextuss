import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Select } from '../../design/primitives'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { listRoutines } from '../../db/repositories/routines'
import { installMorningRecipe } from '../launchers/recipes'
import { createMorningRoutine } from '../routines/templates'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

/** Rutina que sigue al ritual de Virtualización — pieza a medida (#98 P5): elegirla siembra la receta
 * «Mañana consciente» (`installMorningRecipe`), no es un campo plano del esquema. El resto de los
 * campos de este plugin (apertura, presencia, aspecto) ya salen del esquema declarativo (P4). */
export function RoutineSettings() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const routines = useLiveQuery(() => listRoutines(), [])
  const [creatingTemplate, createFromTemplate] = useSubmitGuard(async () => {
    const id = await createMorningRoutine()
    await updateSettings({ virtualizationRoutineId: id })
    await installMorningRecipe(id)
  })

  if (!settings) return null
  const routineId = settings.virtualizationRoutineId ?? null

  async function onRoutineChange(value: string) {
    const id = value === '' ? null : Number(value)
    await updateSettings({ virtualizationRoutineId: id })
    if (id != null) await installMorningRecipe(id)
  }

  return (
    <div className="py-2.5">
      <label className="text-xs text-text-muted">
        Rutina que sigue al ritual
        <Select value={routineId ?? ''} onChange={(e) => void onRoutineChange(e.target.value)} className="mt-1">
          <option value="">Sin elegir (no se instala la receta)</option>
          {routines?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </label>
      {routineId != null ? (
        <p className="mt-1 text-xs text-text-faint">La receta «Mañana consciente» ya sigue esta rutina y desactivó «Empezar el día».</p>
      ) : (
        <Button variant="secondary" size="sm" loading={creatingTemplate} onClick={() => void createFromTemplate()} className="mt-2">
          Crear rutina «Mañana consciente»
        </Button>
      )}
    </div>
  )
}
