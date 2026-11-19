import type { ComponentType } from 'react'
import { ChartGantt, LayoutGrid, Layers } from 'lucide-react'
import { SegmentedControl } from '../../design/primitives'
import { useUIStore, type ChallengesView } from '../../app/uiStore'
import { ChallengeListChain } from './ChallengeListChain'
import { ChallengeListHorizon } from './ChallengeListHorizon'
import { ChallengeListMix, type ChallengeListProps } from './ChallengeListMix'

/** Una lista por vista: solo cambia cómo se pinta la lista; los datos, la ficha, crear y los atajos son
 *  los mismos. Una preferencia guardada que ya no existe cae en Mezcla (lo hace `uiStore`). */
const LISTS: Record<ChallengesView, ComponentType<ChallengeListProps>> = {
  mix: ChallengeListMix,
  chain: ChallengeListChain,
  horizon: ChallengeListHorizon,
}

export function ChallengeList(props: ChallengeListProps) {
  const view = useUIStore((s) => s.challengesView)
  const List = LISTS[view]
  return <List {...props} />
}

const VIEW_OPTIONS = [
  { value: 'mix' as const, label: 'Mezcla', icon: <Layers size={13} strokeWidth={2} aria-hidden="true" className="max-md:hidden" /> },
  { value: 'chain' as const, label: 'Cadena', icon: <LayoutGrid size={13} strokeWidth={2} aria-hidden="true" className="max-md:hidden" /> },
  { value: 'horizon' as const, label: 'Horizonte', icon: <ChartGantt size={13} strokeWidth={2} aria-hidden="true" className="max-md:hidden" /> },
]

/** Selector de vista de «Retos propios»: un `radiogroup` (flechas, Inicio y Fin) cuya elección se
 *  recuerda en este dispositivo. Cambiar de vista repinta los mismos datos, sin reiniciar nada. */
export function ChallengeViewSelector({ className }: { className?: string }) {
  const view = useUIStore((s) => s.challengesView)
  const setView = useUIStore((s) => s.setChallengesView)
  return <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} label="Vista de los retos propios" touch className={className} />
}
