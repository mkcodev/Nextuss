import { HeartPulse } from 'lucide-react'
import { Card } from '../../design/primitives'
import { CheckInFields } from '../checkin/CheckInFields'

export function CheckInCard({ date }: { date: string }) {
  return (
    <Card className="p-3.5">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-text-muted">
        <HeartPulse size={13} strokeWidth={1.75} /> Check-in
      </h3>
      <CheckInFields date={date} />
    </Card>
  )
}
