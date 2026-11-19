import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
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
        className="flex w-full items-center gap-2 rounded-[inherit] px-4 py-3 text-left text-sm"
      >
        <span className="font-semibold text-text">Check-in</span>
        <span className={cn('ml-auto text-xs', done ? 'text-success' : 'text-text-muted')}>{done ? 'Hecho' : 'Sin hacer'}</span>
        <ChevronRight size={15} strokeWidth={2} className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-90')} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="border-t border-border px-4 pt-3 pb-4">
          <CheckInFields date={date} />
        </div>
      )}
    </Card>
  )
}
