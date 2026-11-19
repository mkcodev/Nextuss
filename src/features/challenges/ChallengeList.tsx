import type { ComponentType } from 'react'
import { useUIStore, type ChallengesView } from '../../app/uiStore'
import { ChallengeListMix, type ChallengeListProps } from './ChallengeListMix'

/** Una lista por vista. R2a solo trae Mezcla; R2b añade Cadena y Horizonte aquí (y el selector).
 *  Mientras tanto, una preferencia guardada que aún no tiene lista cae en Mezcla. */
const LISTS: Partial<Record<ChallengesView, ComponentType<ChallengeListProps>>> = {
  mix: ChallengeListMix,
}

export function ChallengeList(props: ChallengeListProps) {
  const view = useUIStore((s) => s.challengesView)
  const List = LISTS[view] ?? ChallengeListMix
  return <List {...props} />
}
