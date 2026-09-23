import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight } from 'lucide-react'
import { Button, Dialog } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { getOverdueTasks, getUnscheduledTasks } from '../../db/repositories/tasks'
import { markRitualStart } from '../../db/repositories/checkins'
import { useDailyCapacity } from '../planner/useDailyCapacity'
import { CheckInFields } from '../checkin/CheckInFields'
import { OverdueTasks } from '../planner/OverdueTasks'
import { useDayStartStore } from './dayStartStore'
import type { Task } from '../../db/types'

type Step = 1 | 2 | 3

function formatHours(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function DayStartFlow() {
  const { open, date, close } = useDayStartStore()
  const [step, setStep] = useState<Step>(1)

  const overdueTasks = useLiveQuery(() => (date ? getOverdueTasks(date) : Promise.resolve([] as Task[])), [date]) ?? []
  const unscheduledTasks =
    useLiveQuery(() => (date ? getUnscheduledTasks(date) : Promise.resolve([] as Task[])), [date]) ?? []
  const { availableMin, scheduledMin } = useDailyCapacity(date ?? '')

  // El paso 2 no aporta nada sin atrasadas — se salta al calcular el siguiente/anterior paso, en
  // vez de con un efecto que corrija `step` después de renderizar con un valor que no tocaba.
  const hasOverdueStep = overdueTasks.length > 0
  const nextStep = (s: Step): Step => (s === 1 ? (hasOverdueStep ? 2 : 3) : 3)
  const prevStep = (s: Step): Step => (s === 3 ? (hasOverdueStep ? 2 : 1) : 1)

  if (!date) return null

  const finish = () => {
    void markRitualStart(date)
    setStep(1)
    close()
  }

  return (
    <Dialog open={open} onClose={finish} title="Empezar el día">
      <div className="space-y-4">
        <div className="flex items-center gap-1.5">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full', s <= step ? 'bg-accent' : 'bg-border')} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">¿Cómo llegas hoy?</p>
            <CheckInFields date={date} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Tienes tareas atrasadas — decide qué hacer con ellas</p>
            <OverdueTasks date={date} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Planificación</p>
            <p className="text-sm text-text">
              {unscheduledTasks.length > 0 ? (
                <>
                  Tienes <span className="font-semibold text-accent">{unscheduledTasks.length}</span> tarea
                  {unscheduledTasks.length === 1 ? '' : 's'} sin programar, y{' '}
                  <span className="font-medium text-text">{formatHours(Math.max(0, availableMin - scheduledMin))}</span>{' '}
                  libres hoy.
                </>
              ) : (
                'No tienes tareas sin programar. Buen punto de partida.'
              )}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={finish}>
            Saltar
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => setStep(prevStep(step))}>
                Atrás
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={() => setStep(nextStep(step))}>
                Siguiente <ArrowRight size={14} strokeWidth={2} />
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Empezar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
