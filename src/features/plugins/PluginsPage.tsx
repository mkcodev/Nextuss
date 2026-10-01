// Página de Plugins (#98 PR1): maestro-detalle (variante B elegida en el mockup #134) — lista con
// búsqueda a la izquierda, ficha completa a la derecha. El interruptor usa `planToggle` para saber si
// hay que confirmar (cascada) y `togglePluginWithUndo` para aplicar con un toast «Deshacer».
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Search } from 'lucide-react'
import { db } from '../../db/schema'
import { usePageTitle } from '../../app/pageTitleStore'
import { Badge, Button, Dialog, EmptyState, Input, Switch } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { useListNav } from '../../app/shortcuts/listNavStore'
import { togglePluginWithUndo } from './actions'
import { useEnabledPlugins } from './pluginsStore'
import { getPlugin, PLUGINS } from './registry'
import { planToggle } from './resolve'
import { PLUGIN_CATEGORIES } from './types'
import type { PluginCategory, PluginId, PluginManifest } from './types'
import { PLUGIN_SETTINGS } from './settings'
import { PluginSettingsPanel } from './settings/PluginSettingsPanel'
import { PLUGIN_PROFILES, type PluginProfile } from './profiles'
import { applyProfileWithUndo, describeProfileChanges } from './profileActions'
import type { Settings } from '../../db/types'

type ConfirmState = { plugin: PluginManifest; on: boolean; cascaded: PluginId[] }

function groupPlugins(plugins: readonly PluginManifest[]): { label: string; items: PluginManifest[] }[] {
  const core = plugins.filter((p) => p.core)
  const groups = [{ label: 'Núcleo', items: core }]
  for (const key of Object.keys(PLUGIN_CATEGORIES) as PluginCategory[]) {
    const items = plugins.filter((p) => p.category === key)
    if (items.length > 0) groups.push({ label: PLUGIN_CATEGORIES[key].label, items })
  }
  return groups.filter((g) => g.items.length > 0)
}

export function PluginsPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const enabled = useEnabledPlugins()
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [profileConfirm, setProfileConfirm] = useState<PluginProfile | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? PLUGINS.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) : PLUGINS),
    [q],
  )
  const groups = useMemo(() => groupPlugins(filtered), [filtered])
  const flatList = useMemo(() => groups.flatMap((g) => g.items), [groups])

  const selectedId = (idParam as PluginId | undefined) ?? flatList.find((p) => !p.core)?.id
  const selected = selectedId ? getPlugin(selectedId) : undefined
  usePageTitle(selected ? selected.name : 'Plugins', [selected?.id])

  const cursorIndex = Math.max(flatList.findIndex((p) => p.id === selectedId), 0)
  useListNav({
    onNext: () => {
      const next = flatList[Math.min(cursorIndex + 1, flatList.length - 1)]
      if (next) navigate(`/plugins/${next.id}`)
    },
    onPrev: () => {
      const prev = flatList[Math.max(cursorIndex - 1, 0)]
      if (prev) navigate(`/plugins/${prev.id}`)
    },
    onActivate: () => {}, // ya se navega con j/k; Enter no tiene una acción propia distinta aquí
  })

  async function requestToggle(plugin: PluginManifest, on: boolean) {
    const { cascaded } = planToggle(plugin.id, on, settings?.plugins)
    if (cascaded.length > 0) setConfirm({ plugin, on, cascaded })
    else await togglePluginWithUndo(plugin.id, on)
  }

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-text">Plugins</h1>
      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        <div className={cn('space-y-3', idParam && 'hidden md:block')}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-faint" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar un plugin…"
                className="pl-8"
                aria-label="Buscar un plugin"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-faint">Perfiles:</span>
            {PLUGIN_PROFILES.map((profile) => (
              <Button key={profile.id} variant="secondary" size="sm" onClick={() => setProfileConfirm(profile)}>
                {profile.label}
              </Button>
            ))}
          </div>

          <nav aria-label="Lista de plugins" className="space-y-4">
            {groups.map((g) => (
              <div key={g.label}>
                <h2 className="mb-1.5 px-1 text-xs font-medium tracking-wide text-text-faint uppercase">{g.label}</h2>
                <div className="space-y-0.5">
                  {g.items.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md pr-2.5 text-sm transition-colors',
                        p.id === selectedId ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-hover',
                      )}
                    >
                      <Link to={`/plugins/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2">
                        <p.icon size={16} strokeWidth={1.75} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      </Link>
                      {p.core ? (
                        <Badge tone="neutral" className="shrink-0">Núcleo</Badge>
                      ) : (
                        <Switch
                          checked={enabled.has(p.id)}
                          onChange={(on) => void requestToggle(p, on)}
                          label={`${enabled.has(p.id) ? 'Desactivar' : 'Activar'} ${p.name}`}
                          className="shrink-0"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {flatList.length === 0 && <p className="px-1 text-sm text-text-faint">Sin resultados.</p>}
          </nav>
        </div>

        <div className={cn(!idParam && 'hidden md:block')}>
          {selected ? (
            <PluginDetail plugin={selected} on={enabled.has(selected.id)} onToggle={(on) => void requestToggle(selected, on)} settings={settings} />
          ) : (
            <EmptyState icon={Search} title="Sin resultados" description="Ningún plugin coincide con la búsqueda." />
          )}
        </div>
      </div>

      <Dialog
        open={confirm != null}
        onClose={() => setConfirm(null)}
        title={`${confirm?.on ? 'Activar' : 'Desactivar'} ${confirm?.plugin.name ?? ''}`}
        size="sm"
      >
        <p className="text-sm text-text-muted">
          {confirm?.on ? 'Esto también activará' : 'Esto también desactivará'}:{' '}
          {confirm?.cascaded.map((id) => getPlugin(id).name).join(', ')}.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirm?.on ? 'primary' : 'danger'}
            onClick={async () => {
              if (!confirm) return
              await togglePluginWithUndo(confirm.plugin.id, confirm.on)
              setConfirm(null)
            }}
          >
            {confirm?.on ? 'Activar' : 'Desactivar'}
          </Button>
        </div>
      </Dialog>

      <Dialog open={profileConfirm != null} onClose={() => setProfileConfirm(null)} title={`Aplicar el perfil «${profileConfirm?.label ?? ''}»`} size="sm">
        {profileConfirm && (
          <>
            <p className="mb-3 text-sm text-text-muted">{profileConfirm.description}</p>
            {(() => {
              const changes = describeProfileChanges(profileConfirm, settings?.plugins)
              return changes.length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {changes.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-text-muted">
                      <span>{getPlugin(c.id).name}</span>
                      <span className="text-text">{c.on ? 'Se activa' : 'Se desactiva'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-faint">Ya tienes esta combinación de plugins activa.</p>
              )
            })()}
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setProfileConfirm(null)}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!profileConfirm) return
              await applyProfileWithUndo(profileConfirm, settings?.plugins)
              setProfileConfirm(null)
            }}
          >
            Aplicar
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

interface PluginDetailProps {
  plugin: PluginManifest
  on: boolean
  onToggle: (on: boolean) => void
  settings: Settings | undefined
}

function PluginDetail({ plugin, on, onToggle, settings }: PluginDetailProps) {
  const category = plugin.category ? PLUGIN_CATEGORIES[plugin.category] : undefined
  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/plugins" className="-ml-1 rounded-sm p-1 text-text-faint hover:bg-surface-hover hover:text-text md:hidden" aria-label="Volver a Plugins">
            <ArrowLeft size={16} strokeWidth={1.75} />
          </Link>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <plugin.icon size={19} strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text">{plugin.name}</h2>
            {category && (
              <Badge tone="neutral" className="mt-1" style={{ color: category.color, background: `color-mix(in srgb, ${category.color} 14%, transparent)` }}>
                {category.label}
              </Badge>
            )}
            {plugin.core && (
              <Badge tone="neutral" className="mt-1">
                Núcleo · siempre activo
              </Badge>
            )}
          </div>
        </div>
        {!plugin.core && (
          <Switch checked={on} onChange={onToggle} label={`${on ? 'Desactivar' : 'Activar'} ${plugin.name}`} className="shrink-0" />
        )}
      </div>

      <p className="text-sm text-text-muted">{plugin.description}</p>

      {(plugin.requires?.length || plugin.enhances?.length) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {plugin.requires && plugin.requires.length > 0 && (
            <p className="text-text-muted">
              <span className="font-medium text-text">Necesita:</span>{' '}
              {plugin.requires.map((id) => getPlugin(id).name).join(', ')}
            </p>
          )}
          {plugin.enhances && plugin.enhances.length > 0 && (
            <p className="text-text-muted">
              <span className="font-medium text-text">Mejora con:</span>{' '}
              {plugin.enhances.map((id) => getPlugin(id).name).join(', ')}
            </p>
          )}
        </div>
      )}

      <PluginSettingsPanel spec={PLUGIN_SETTINGS[plugin.id]} settings={settings} notificationsEnabled={settings?.notificationsEnabled === true} />
    </div>
  )
}
