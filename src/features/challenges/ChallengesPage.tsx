import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button, Dialog, Kbd, Skeleton } from '../../design/primitives'
import { usePageTitle } from '../../app/pageTitleStore'
import { useListNav } from '../../app/shortcuts/listNavStore'
import { usePluginEnabled } from '../plugins/pluginsStore'
import { abandonNow } from './challengeActions'
import { useChallengeFormStore } from './challengeFormStore'
import { ChallengeList } from './ChallengeList'
import { ChallengeSheet } from './ChallengeSheet'
import { ChallengesEmpty } from './ChallengesEmpty'
import { MissionsToday } from './MissionsToday'
import { useCelebratedChallengeMark } from './useCelebratedChallengeMark'
import { useMarkShortcut } from './useMarkShortcut'
import { useChallengesData, useChallengesToday } from './useChallengesData'
import type { ChallengeItem } from './challengesData'

const focusRow = (id: number) => document.querySelector<HTMLElement>(`[data-challenge-row="${id}"]`)?.focus()

/** Retos (#191): las misiones de hoy y tus retos propios, con la vista Mezcla. Detalle = ficha lateral
 *  en `/retos/:id` (enlace directo y «atrás» funcionan), crear = diálogo global (`c`, paleta). */
export function ChallengesPage() {
  const today = useChallengesToday()
  const data = useChallengesData(today)
  const gamified = usePluginEnabled('gamification')
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const openCreate = useChallengeFormStore((s) => s.openCreate)
  const { playing, toggleToday } = useCelebratedChallengeMark(today)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [cursor, setCursor] = useState(-1)
  const [abandoning, setAbandoning] = useState<ChallengeItem | null>(null)
  const [abandonOpen, setAbandonOpen] = useState(false)

  const rows = useMemo(() => (data ? [...data.active, ...data.finished] : []), [data])
  const openId = idParam !== undefined && /^\d+$/.test(idParam) ? Number(idParam) : null
  const openItem = openId === null ? null : (rows.find((r) => r.challenge.id === openId) ?? null)

  usePageTitle(openItem ? openItem.challenge.title : 'Retos', [openItem?.challenge.title])

  // Un enlace a un reto que ya no existe (o un id que no es un número) vuelve a la lista.
  useEffect(() => {
    if (idParam !== undefined && data && openItem === null) navigate('/retos', { replace: true })
  }, [idParam, data, openItem, navigate])

  const open = (id: number) => navigate(`/retos/${id}`)
  const close = () => navigate('/retos')

  // Abrir el diálogo en el siguiente ciclo: el menú de la ficha devuelve el foco a su botón al cerrarse
  // y el diálogo debe recordar ESE botón (no el elemento del menú, que desaparece) para devolvérselo.
  const askAbandon = (item: ChallengeItem) =>
    window.setTimeout(() => {
      setAbandoning(item)
      setAbandonOpen(true)
    }, 0)

  const modalOpen = openItem !== null || abandonOpen

  const move = (delta: 1 | -1) => {
    if (rows.length === 0) return
    const from = cursor < 0 ? (delta > 0 ? -1 : rows.length) : cursor
    const next = Math.min(Math.max(from + delta, 0), rows.length - 1)
    setCursor(next)
    focusRow(rows[next].challenge.id)
  }

  // j/k mueven el foco real por los retos (el lector de pantalla los lee), Enter abre la ficha y `c`
  // crea. Con la ficha o un diálogo abiertos la página de detrás no escucha. `n` no se toca: sigue
  // siendo «nueva tarea», como en el resto de la app.
  useListNav(
    modalOpen
      ? null
      : {
          onNext: () => move(1),
          onPrev: () => move(-1),
          onActivate: () => {
            // Con foco en un botón o enlace, Enter ya lo pulsa; esto solo cubre el caso sin foco.
            const el = document.activeElement
            if (el && el !== document.body && el.matches('button, a, [role=button], summary')) return
            const target = rows[cursor]
            if (target) open(target.challenge.id)
          },
          onCreate: () => openCreate(),
        },
  )

  // `x` marca o desmarca hoy en el reto con foco o, si no, en el del cursor.
  useMarkShortcut(() => {
    const focusedId = document.activeElement?.closest('[data-challenge-id]')?.getAttribute('data-challenge-id')
    const target = focusedId ? rows.find((r) => r.challenge.id === Number(focusedId)) : rows[cursor]
    if (target && target.markReason === null) void toggleToday(target)
  }, 'page')

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight text-text outline-none">
          Retos
        </h1>
        <Button onClick={() => openCreate()}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" /> Nuevo reto <Kbd className="bg-on-accent/20 text-on-accent">c</Kbd>
        </Button>
      </header>

      <MissionsToday data={data} gamified={gamified} />

      <section aria-labelledby="retos-propios" className="space-y-2.5">
        <h2 id="retos-propios" className="text-sm font-semibold text-text">
          Retos propios
        </h2>
        {data === undefined ? (
          <div aria-hidden="true" className="space-y-2">
            <Skeleton className="h-[110px] w-full" />
          </div>
        ) : data.active.length === 0 ? (
          <ChallengesEmpty compact={data.finished.length > 0} />
        ) : (
          <ChallengeList
            items={data.active}
            today={today}
            playing={playing}
            openId={openItem?.challenge.id}
            onOpen={open}
            onToggleToday={(item) => void toggleToday(item)}
            label="Retos propios en marcha"
          />
        )}
        {rows.length > 0 && (
          <p className="hidden items-center gap-x-1.5 text-xs text-text-muted md:flex">
            <Kbd>j</Kbd>
            <Kbd>k</Kbd> moverse · <Kbd>x</Kbd> marcar hoy · <Kbd>Enter</Kbd> abrir · <Kbd>c</Kbd> nuevo reto
          </p>
        )}
      </section>

      {data && data.finished.length > 0 && (
        <section aria-labelledby="retos-terminados" className="space-y-2.5">
          <h2 id="retos-terminados" className="text-sm font-semibold text-text">
            Terminados
          </h2>
          <ChallengeList
            items={data.finished}
            today={today}
            playing={playing}
            openId={openItem?.challenge.id}
            onOpen={open}
            onToggleToday={(item) => void toggleToday(item)}
            header={false}
            label="Retos terminados"
          />
        </section>
      )}

      <ChallengeSheet
        item={openItem}
        today={today}
        playing={playing}
        gamified={gamified}
        onClose={close}
        onToggleToday={(item) => void toggleToday(item)}
        onAskAbandon={askAbandon}
        returnFocusTo={() => headingRef.current}
      />

      {/* Al <body>, como la ficha: dentro de la página quedaría por debajo de ella. */}
      {createPortal(
        <Dialog open={abandonOpen} onClose={() => setAbandonOpen(false)} title="¿Abandonar este reto?">
          <p className="text-ui text-pretty text-text-muted">
            {abandoning ? <strong className="font-semibold text-text">«{abandoning.challenge.title}»</strong> : 'El reto'} se queda en tu historial
            con lo que llevas, y conservas el XP ganado. No se puede retomar.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" autoFocus onClick={() => setAbandonOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setAbandonOpen(false)
                if (abandoning) void abandonNow(abandoning.challenge.id, abandoning.challenge.title)
              }}
            >
              Abandonar
            </Button>
          </div>
        </Dialog>,
        document.body,
      )}
    </div>
  )
}
