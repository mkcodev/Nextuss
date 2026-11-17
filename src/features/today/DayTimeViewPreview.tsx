import { BlocksView, RingView, RulerView } from './DayTimeCard'
import type { DayTimeSummary } from './dayTime'

// Jornada 8:00-22:00 de muestra, a mitad de camino (15:00), con un bloque ya hecho y uno por venir —
// solo para que las 3 vistas tengan algo representativo que pintar en la miniatura.
const SAMPLE: DayTimeSummary = {
  phase: 'during',
  startMin: 8 * 60,
  endMin: 22 * 60,
  leftMin: 7 * 60,
  elapsed: 0.5,
  plannedLeftMin: 90,
  freeLeftMin: 5 * 60 + 30,
  blocks: [
    { taskId: 1, title: 'Reunión', startMin: 9 * 60, endMin: 10 * 60, done: true },
    { taskId: 2, title: 'Diseño', startMin: 16 * 60, endMin: 17 * 60 + 30, done: false },
  ],
  next: { title: 'Diseño', start: '16:00', inMin: 60 },
}
const SAMPLE_NOW_MIN = 15 * 60

/** Miniatura de `dayTimeView` (#98 P7): a diferencia de los temas de Rutinas/Virtualización, esta SÍ
 * reusa los componentes reales de `DayTimeCard` (con datos fijos, reducidos con `scale`) en vez de una
 * ilustración aparte — el plan lo pide así porque son vistas de datos, no solo estética. */
export function DayTimeViewPreview({ value }: { value: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none h-full w-full overflow-hidden rounded-sm bg-bg-soft p-1">
      <div className="w-[182%] origin-top-left scale-[0.55]">
        {value === 'ruler' && <RulerView s={SAMPLE} nowMin={SAMPLE_NOW_MIN} />}
        {value === 'ring' && <RingView s={SAMPLE} />}
        {value === 'blocks' && <BlocksView s={SAMPLE} nowMin={SAMPLE_NOW_MIN} />}
      </div>
    </div>
  )
}
