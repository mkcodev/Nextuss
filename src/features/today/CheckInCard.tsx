import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, HeartPulse } from 'lucide-react'
import { Card } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { getCheckInForDate } from '../../db/repositories/checkins'
import { CheckInFields } from '../checkin/CheckInFields'

/** Check-in del día, plegado por defecto para no sumar otra zona a Hoy: la cabecera dice si está
 *  hecho y al desplegar aparecen las estrellas y la nota. */
export function CheckInCard({ date }: { date: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const checkin = useLiveQuery(() => getCheckInForDate(date), [date])
  const done = !!checkin && (checkin.energy != null || checkin.mood != null || checkin.focus != null)

  return (
    <Card className="p-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-sm"
      >
        <HeartPulse size={15} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
        <span className="font-semibold text-text">Check-in</span>
        <span className="flex-1 text-text-muted">{done ? '· hecho' : '· sin hacer'}</span>
        <ChevronRight size={15} strokeWidth={2} className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-90')} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="border-t border-border px-3.5 pt-3 pb-3.5">
          <CheckInFields date={date} />
        </div>
      )}
    </Card>
  )
}
