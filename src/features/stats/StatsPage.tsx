import { useSearchParams } from 'react-router-dom'
import { Tabs, SegmentedControl } from '../../design/primitives'
import { STATS_RANGE_OPTIONS, type StatsRange } from './range'
import { ResumenTab } from './tabs/ResumenTab'
import { HabitosTab } from './tabs/HabitosTab'
import { TiempoTab } from './tabs/TiempoTab'
import { InsightsTab } from './tabs/InsightsTab'
import { InformesTab } from './tabs/InformesTab'

type Tab = 'resumen' | 'habitos' | 'tiempo' | 'insights' | 'informes'
const TABS: { key: Tab; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'habitos', label: 'Hábitos' },
  { key: 'tiempo', label: 'Tiempo' },
  { key: 'insights', label: 'Insights' },
  { key: 'informes', label: 'Informes' },
]

export function StatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = TABS.some((t) => t.key === tabParam) ? (tabParam as Tab) : 'resumen'
  const rangeParam = searchParams.get('range')
  const range: StatsRange = STATS_RANGE_OPTIONS.some((r) => r.value === rangeParam) ? (rangeParam as StatsRange) : '30d'

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(searchParams)
    if (t === 'resumen') next.delete('tab')
    else next.set('tab', t)
    setSearchParams(next, { replace: true })
  }

  const setRange = (r: StatsRange) => {
    const next = new URLSearchParams(searchParams)
    if (r === '30d') next.delete('range')
    else next.set('range', r)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Estadísticas</p>
          <h1 className="mt-1 text-2xl font-semibold text-text">Cómo te ha ido</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab !== 'informes' && <SegmentedControl options={STATS_RANGE_OPTIONS} value={range} onChange={setRange} />}
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
        </div>
      </header>

      {tab === 'resumen' && <ResumenTab range={range} />}
      {tab === 'habitos' && <HabitosTab range={range} />}
      {tab === 'tiempo' && <TiempoTab range={range} />}
      {tab === 'insights' && <InsightsTab range={range} />}
      {tab === 'informes' && <InformesTab />}
    </div>
  )
}
