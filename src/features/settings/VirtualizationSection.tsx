import { useLiveQuery } from 'dexie-react-hooks'
import { Radar } from 'lucide-react'
import { Button, Card, Switch, Select, SegmentedControl, NumberInput, type SegmentOption } from '../../design/primitives'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { listRoutines } from '../../db/repositories/routines'
import { installMorningRecipe } from '../launchers/recipes'
import { createMorningRoutine } from '../routines/templates'
import { VirtualizationThemeSwitch } from '../virtualization/VirtualizationThemeSwitch'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import type { MeditationPattern } from '../../db/types'

const PATTERN_OPTIONS: SegmentOption<MeditationPattern>[] = [
  { value: 'box4444', label: 'Caja 4-4-4-4' },
  { value: '478', label: '4-7-8' },
  { value: 'coherence55', label: 'Coherencia 5-5' },
]

/** Ajustes de la Virtualización (#97): el resto de sus campos (tema, patrón/duración de meditación) ya
 * existían en `Settings` desde PR1-3, pero sin ningún sitio en Ajustes donde tocarlos salvo el propio
 * selector de tema inline en la Cabina. Elegir una rutina aquí es lo que de verdad activa el ritual
 * completo: siembra la receta «Mañana consciente» (`installMorningRecipe`), que hasta ahora no tenía
 * ningún llamador. */
export function VirtualizationSection() {
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
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <Radar size={15} strokeWidth={1.75} /> Virtualización
        </h2>
        <Switch
          checked={settings.virtualizationEnabled !== false}
          onChange={(next) => updateSettings({ virtualizationEnabled: next })}
          label="Activar la Virtualización"
        />
      </div>
      <p className="mb-3 text-xs text-text-faint">Ritual de entrada al día: transmisión, escaneo, presencia y arranque de tu rutina matutina.</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-text-muted">
          Hasta qué hora proponerla
          <NumberInput
            min={1}
            max={23}
            value={settings.virtualizationWindowEndHour ?? 12}
            onChange={(v) => updateSettings({ virtualizationWindowEndHour: Math.min(23, v) })}
            className="mt-1 w-full"
          />
        </label>
        <label className="text-xs text-text-muted">
          Duración de Presencia (min)
          <NumberInput
            min={1}
            max={5}
            value={Math.round((settings.meditationDurationSec ?? 120) / 60)}
            onChange={(v) => updateSettings({ meditationDurationSec: Math.min(5, v) * 60 })}
            className="mt-1 w-full"
          />
        </label>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs text-text-muted">Patrón de respiración</p>
        <SegmentedControl
          options={PATTERN_OPTIONS}
          value={settings.meditationPattern ?? 'box4444'}
          onChange={(v) => updateSettings({ meditationPattern: v })}
          label="Patrón de respiración"
        />
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs text-text-muted">Tema visual</p>
        <VirtualizationThemeSwitch settings={settings} />
      </div>

      <div className="mt-3 border-t border-border pt-3">
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

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="text-xs font-medium text-text">Sonido del ritual</p>
          <p className="text-xs text-text-faint">Zumbido, barrido y destello final</p>
        </div>
        <Switch
          checked={settings.virtualizationSoundEnabled !== false}
          onChange={(next) => updateSettings({ virtualizationSoundEnabled: next })}
          label="Sonido de la Virtualización"
        />
      </div>
    </Card>
  )
}
