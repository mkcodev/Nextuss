import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../../lib/cn'
import { updateSettings } from '../../../db/repositories/settings'
import { Switch } from '../../../design/primitives/Switch'
import type { Settings } from '../../../db/types'
import { NOTIFY_META } from '../../notifications/notifyMeta'
import { SettingRow } from './SettingRow'
import type { PluginSettingsSpec, SettingField } from './types'

const DEFAULT_GROUP = 'Ajustes'
const NOTIFY_GROUP = 'Avisos'

function groupFields(fields: SettingField[]): { group: string; fields: Exclude<SettingField, { kind: 'custom' }>[] }[] {
  const order: string[] = []
  const byGroup = new Map<string, Exclude<SettingField, { kind: 'custom' }>[]>()
  for (const field of fields) {
    if (field.kind === 'custom') continue // llega en P5, cuando exista su componente real
    const group = field.group ?? DEFAULT_GROUP
    if (!byGroup.has(group)) {
      byGroup.set(group, [])
      order.push(group)
    }
    byGroup.get(group)!.push(field)
  }
  return order.map((group) => ({ group, fields: byGroup.get(group)! }))
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

/** Ficha con ajustes de un plugin (#98 P4): variante B del mockup (índice fijo + scroll-spy) con la
 * cabecera-panel prestada de C ya en `PluginDetail`. Enlace profundo `/plugins/:id#campo`: desplaza,
 * resalta 1,5 s. Grupos sin campos (plugin sin ajustes propios, o con avisos apagados) no aparecen. */
export function PluginSettingsPanel({
  spec,
  settings,
  notificationsEnabled,
}: {
  spec: PluginSettingsSpec
  settings: Settings | undefined
  /** El interruptor maestro de Ajustes › Notificaciones: si está apagado, los avisos de esta ficha
   * salen deshabilitados. */
  notificationsEnabled: boolean
}) {
  const { hash } = useLocation()
  const [highlight, setHighlight] = useState<string | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupFields(spec.fields), [spec.fields])
  const notify = spec.notify ?? []

  const sections = useMemo(
    () => [...groups.map((g) => ({ id: slug(g.group), label: g.group })), ...(notify.length > 0 ? [{ id: slug(NOTIFY_GROUP), label: NOTIFY_GROUP }] : [])],
    [groups, notify.length],
  )

  useEffect(() => {
    if (!hash) return
    const id = hash.slice(1)
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    setHighlight(id)
    const t = setTimeout(() => setHighlight(null), 1500)
    return () => clearTimeout(t)
  }, [hash])

  useEffect(() => {
    const root = contentRef.current
    if (!root || sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { root, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  if (sections.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-[128px_minmax(0,1fr)]">
      <nav aria-label="Secciones de la ficha" className="flex gap-1 overflow-x-auto sm:sticky sm:top-4 sm:flex-col sm:self-start sm:overflow-visible">
        {sections.map((s) => (
          <Link
            key={s.id}
            to={{ hash: s.id }}
            replace
            className={cn(
              'shrink-0 rounded-sm px-2 py-1.5 text-xs whitespace-nowrap',
              active === s.id ? 'bg-surface-hover font-medium text-text' : 'text-text-faint hover:text-text-muted',
            )}
            aria-current={active === s.id ? 'true' : undefined}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      <div ref={contentRef} className="min-w-0 space-y-5">
        {groups.map((g) => (
          <section key={g.group} id={slug(g.group)}>
            <h3 className="mb-1 text-xs font-medium tracking-wide text-text-faint uppercase">{g.group}</h3>
            <div className="divide-y divide-border rounded-md border border-border bg-bg-soft px-3">
              {g.fields.map((field) => (
                <SettingRow key={field.key} field={field} settings={settings} id={field.key} highlighted={highlight === field.key} />
              ))}
            </div>
          </section>
        ))}

        {notify.length > 0 && (
          <section id={slug(NOTIFY_GROUP)}>
            <h3 className="mb-1 text-xs font-medium tracking-wide text-text-faint uppercase">{NOTIFY_GROUP}</h3>
            {!notificationsEnabled && <p className="mb-1.5 text-xs text-text-faint">Activa las notificaciones en Ajustes → Notificaciones.</p>}
            <div className="divide-y divide-border rounded-md border border-border bg-bg-soft px-3">
              {notify.map((key) => {
                const meta = NOTIFY_META.find((m) => m.key === key)
                if (!meta) return null
                const value = (settings?.[key] as boolean | undefined) !== false
                return (
                  <div key={key} className={cn('flex items-center justify-between gap-3 py-2.5', highlight === key && 'bg-accent-soft transition-colors')} id={key}>
                    <div>
                      <p className="text-sm text-text-muted">{meta.label}</p>
                      <p className="text-xs text-text-faint">{meta.description}</p>
                    </div>
                    <Switch
                      checked={value}
                      disabled={!notificationsEnabled}
                      onChange={(next) => void updateSettings({ [key]: next })}
                      label={meta.label}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
