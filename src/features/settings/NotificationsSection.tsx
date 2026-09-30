import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Bell, BellOff, ChevronRight } from 'lucide-react'
import { Card, Switch, Input } from '../../design/primitives'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'
import { getNotificationPermissionState, requestNotificationPermission, type NotificationPermissionState } from '../notifications/permission'
import { NOTIFY_META } from '../notifications/notifyMeta'
import { PLUGINS } from '../plugins/registry'
import { PLUGIN_SETTINGS } from '../plugins/settings'

const NOTIFY_OWNERS = PLUGINS.filter((p) => (PLUGIN_SETTINGS[p.id].notify?.length ?? 0) > 0).map((p) => ({
  plugin: p,
  labels: (PLUGIN_SETTINGS[p.id].notify ?? []).map((key) => NOTIFY_META.find((m) => m.key === key)?.label).filter((l): l is string => !!l),
}))

/** Interruptor maestro + horas de silencio (global) — el resto de avisos vive en la ficha de cada
 * plugin (#98 P4): esta lista solo enlaza allí, `NOTIFY_OWNERS` sale de `PLUGIN_SETTINGS`, así que
 * nunca hay que tocar dos sitios al mudar un aviso de plugin. */
export function NotificationsSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [permission, setPermission] = useState<NotificationPermissionState>(getNotificationPermissionState)
  const push = useToastStore((s) => s.push)

  const masterOn = permission === 'granted' && settings?.notificationsEnabled === true

  const toggleMaster = async (next: boolean) => {
    if (!next) {
      await updateSettings({ notificationsEnabled: false })
      return
    }
    let state = permission
    if (state === 'default') {
      state = await requestNotificationPermission()
      setPermission(state)
    }
    if (state !== 'granted') {
      push({
        title: state === 'denied' ? 'Notificaciones bloqueadas' : 'No se pudo activar',
        description:
          state === 'denied'
            ? 'Actívalas desde los ajustes del sitio en el navegador.'
            : 'Tu navegador no soporta notificaciones.',
      })
      return
    }
    await updateSettings({ notificationsEnabled: true })
  }

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          {masterOn ? <Bell size={15} strokeWidth={1.75} /> : <BellOff size={15} strokeWidth={1.75} />}
          Notificaciones
        </h2>
        <Switch checked={masterOn} onChange={toggleMaster} label="Activar notificaciones" />
      </div>
      <p className="mb-3 text-xs text-text-faint">
        {permission === 'unsupported'
          ? 'Tu navegador no soporta notificaciones.'
          : permission === 'denied'
            ? 'Bloqueadas en el navegador — actívalas desde los ajustes del sitio para poder recibirlas.'
            : 'La app está abierta y revisa cada 30s si toca avisarte de algo. Nunca se piden permisos sin que lo actives tú.'}
      </p>

      {masterOn && (
        <>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <label className="text-xs text-text-muted">
              Silencio desde
              <Input
                type="time"
                value={settings?.quietHoursStart ?? ''}
                onChange={(e) => updateSettings({ quietHoursStart: e.target.value || undefined })}
                className="mt-1 !px-2"
              />
            </label>
            <label className="text-xs text-text-muted">
              Silencio hasta
              <Input
                type="time"
                value={settings?.quietHoursEnd ?? ''}
                onChange={(e) => updateSettings({ quietHoursEnd: e.target.value || undefined })}
                className="mt-1 !px-2"
              />
            </label>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-1.5 text-xs font-medium text-text-muted">Avisos por plugin</p>
            <div className="divide-y divide-border">
              {NOTIFY_OWNERS.map(({ plugin, labels }) => (
                <Link
                  key={plugin.id}
                  to={`/plugins/${plugin.id}#avisos`}
                  className="flex items-center gap-2.5 py-2 text-xs text-text-muted hover:text-text"
                >
                  <plugin.icon size={14} strokeWidth={1.75} className="shrink-0 text-text-faint" />
                  <span className="flex-1 truncate">
                    {plugin.name} <span className="text-text-faint">· {labels.join(', ')}</span>
                  </span>
                  <ChevronRight size={13} strokeWidth={1.75} className="shrink-0 text-text-faint" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
