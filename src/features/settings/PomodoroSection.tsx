import { useLiveQuery } from 'dexie-react-hooks'
import { Timer } from 'lucide-react'
import { Card, Switch, Input } from '../../design/primitives'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { readSetting } from '../../db/settingsDefaults'
import { DEFAULT_DURATIONS_MIN } from '../focus/durations'

export function PomodoroSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Timer size={15} strokeWidth={1.75} /> Pomodoro
      </h2>
      <p className="mb-3 text-xs text-text-faint">Duraciones de cada tramo. El tiempo se calcula por reloj real, así que sigue corriendo aunque cambies de pestaña.</p>

      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-text-muted">
          Foco (min)
          <Input
            type="number"
            min={1}
            max={180}
            value={readSetting(settings, 'pomodoroWorkMin')}
            onChange={(e) => updateSettings({ pomodoroWorkMin: Number(e.target.value) || DEFAULT_DURATIONS_MIN.work })}
            className="mt-1 !px-2"
          />
        </label>
        <label className="text-xs text-text-muted">
          Descanso (min)
          <Input
            type="number"
            min={1}
            max={60}
            value={readSetting(settings, 'pomodoroBreakMin')}
            onChange={(e) => updateSettings({ pomodoroBreakMin: Number(e.target.value) || DEFAULT_DURATIONS_MIN.break })}
            className="mt-1 !px-2"
          />
        </label>
        <label className="text-xs text-text-muted">
          D. largo (min)
          <Input
            type="number"
            min={1}
            max={90}
            value={readSetting(settings, 'pomodoroLongBreakMin')}
            onChange={(e) => updateSettings({ pomodoroLongBreakMin: Number(e.target.value) || DEFAULT_DURATIONS_MIN.longBreak })}
            className="mt-1 !px-2"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div>
          <p className="text-xs font-medium text-text">Sonido al terminar</p>
          <p className="text-xs text-text-faint">Además de la notificación, un tono corto</p>
        </div>
        <Switch
          checked={settings?.pomodoroSoundEnabled === true}
          onChange={(next) => updateSettings({ pomodoroSoundEnabled: next })}
          label="Sonido al terminar el pomodoro"
        />
      </div>
    </Card>
  )
}
