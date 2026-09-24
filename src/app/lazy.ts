import { lazy, type ComponentType } from 'react'

/** `React.lazy` para módulos con exportación con nombre (el estilo de todo el repo). */
export function lazyNamed<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}
