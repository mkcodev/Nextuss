import { useLiveQuery } from 'dexie-react-hooks'
import { createAttribute, listAttributes } from '../../db/repositories/gamification'
import { DEFAULT_ICON_KEY } from '../../design/icons'

const DEFAULT_ICON = DEFAULT_ICON_KEY
const DEFAULT_COLOR = '#5EC8FF'

/** Attribute list plus a quick-create used from the habit form ("crear atributo nuevo"). */
export function useAttributesWithCreate() {
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []

  const createAndSelect = (name: string) =>
    createAttribute({ name, icon: DEFAULT_ICON, color: DEFAULT_COLOR })

  return { attributes, createAndSelect }
}
