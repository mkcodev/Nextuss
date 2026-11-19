import { useId, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import { Minus, Plus } from 'lucide-react'
import { Button, Dialog, Field, Input, Kbd } from '../../design/primitives'
import { ChallengeActionError, createCustomChallenge } from '../../db/repositories/challenges'
import { MAX_DURATION_DAYS, MAX_SHIELDS, MAX_TITLE_LENGTH, MIN_DURATION_DAYS, defaultShields } from '../../lib/challenges/custom'
import { endDateFor } from '../../lib/challenges/dayRange'
import { formatDayMonth } from '../../lib/challenges/calendar'
import { parseChallengeDraft } from '../../lib/challenges/parseDraft'
import { cn } from '../../lib/cn'
import { parseDateKey, todayKey } from '../../lib/dates'
import { useToastStore } from '../../lib/toastStore'
import { XP_PER_CHALLENGE_DAY, challengePerfectBonus } from '../../lib/xp'
import { usePluginEnabled } from '../plugins/pluginsStore'
import { DayMark } from './DayMark'
import { useChallengeFormStore, type ChallengeFormPrefill } from './challengeFormStore'

const PRESETS = [7, 21, 30, 66]
const PREVIEW_MARKS = 42
const CHIP = 'rounded-full px-2.5 py-0.5 text-xs font-medium'

/** El diálogo «Nuevo reto propio». Una sola instancia global (ver `challengeFormStore`): se abre desde la
 *  página de retos, la tecla `c` y la paleta. El panel vive solo mientras está abierto, así que su estado
 *  empieza limpio cada vez. */
export function ChallengeForm() {
  const open = useChallengeFormStore((s) => s.open)
  const prefill = useChallengeFormStore((s) => s.prefill)
  const close = useChallengeFormStore((s) => s.close)

  return (
    <Dialog open={open} onClose={close} title="Nuevo reto propio" size="md">
      <FormBody prefill={prefill} onClose={close} />
    </Dialog>
  )
}

function FormBody({ prefill, onClose }: { prefill?: ChallengeFormPrefill; onClose: () => void }) {
  const navigate = useNavigate()
  const gamified = usePluginEnabled('gamification')
  const today = useMemo(() => todayKey(), [])
  const daysId = useId()

  const [text, setText] = useState(prefill?.text ?? '')
  const [days, setDays] = useState(prefill?.days ?? 30)
  const [daysRaw, setDaysRaw] = useState(String(prefill?.days ?? 30))
  // `null` = el valor por defecto según la duración (uno cada 10 días, hasta 3).
  const [shields, setShields] = useState<number | null>(prefill?.shields ?? null)
  const [detected, setDetected] = useState({ days: prefill?.days !== undefined, shields: prefill?.shields !== undefined })
  // Se pone a true al pulsar «Crear reto»: el error del nombre vacío solo sale entonces, no mientras se escribe.
  const [submitted, setSubmitted] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const daysRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const title = useMemo(() => parseChallengeDraft(text).title, [text])
  const effectiveShields = shields ?? defaultShields(days)
  const endDate = endDateFor(today, days)
  const daysValid = daysRaw.trim() !== '' && Number.isInteger(Number(daysRaw)) && Number(daysRaw) >= MIN_DURATION_DAYS && Number(daysRaw) <= MAX_DURATION_DAYS

  const titleError =
    title.length > MAX_TITLE_LENGTH
      ? `El nombre es demasiado largo (máximo ${MAX_TITLE_LENGTH} caracteres).`
      : submitted && title.length === 0
        ? 'Falta el nombre: escribe qué quieres hacer cada día.'
        : undefined
  const daysError = daysValid ? undefined : `La duración debe ser de ${MIN_DURATION_DAYS} a ${MAX_DURATION_DAYS} días.`

  function applyDays(n: number, fromText = false) {
    setDays(n)
    setDaysRaw(String(n))
    setDetected((d) => ({ ...d, days: fromText }))
  }

  function onText(value: string) {
    setText(value)
    setServerError(null)
    const draft = parseChallengeDraft(value)
    if (draft.days !== undefined) applyDays(draft.days, true)
    else setDetected((d) => ({ ...d, days: false }))
    if (draft.shields !== undefined) {
      setShields(draft.shields)
      setDetected((d) => ({ ...d, shields: true }))
    } else {
      setDetected((d) => ({ ...d, shields: false }))
    }
  }

  function onDaysInput(value: string) {
    setDaysRaw(value)
    setDetected((d) => ({ ...d, days: false }))
    const n = Number(value)
    if (value.trim() !== '' && Number.isInteger(n) && n >= MIN_DURATION_DAYS && n <= MAX_DURATION_DAYS) setDays(n)
  }

  function onEndDate(value: string) {
    if (!value) return
    const n = differenceInCalendarDays(parseDateKey(value), parseDateKey(today)) + 1
    applyDays(Math.min(MAX_DURATION_DAYS, Math.max(MIN_DURATION_DAYS, n)))
  }

  function stepShields(delta: number) {
    setShields(Math.min(MAX_SHIELDS, Math.max(0, effectiveShields + delta)))
    setDetected((d) => ({ ...d, shields: false }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSubmitted(true)
    // «Crear reto» siempre está activo: si falta algo, se explica y el foco va al campo que lo arregla.
    if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
      titleRef.current?.focus()
      return
    }
    if (!daysValid) {
      daysRef.current?.focus()
      return
    }
    setSaving(true)
    setServerError(null)
    try {
      const id = await createCustomChallenge({ title, durationDays: days, shields: effectiveShields })
      onClose()
      useToastStore.getState().push({
        title: 'Reto creado',
        description: title,
        action: { label: 'Ver', onClick: () => navigate(`/retos/${id}`) },
      })
    } catch (err) {
      if (err instanceof ChallengeActionError) setServerError(err.message)
      else throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <Field
        label="Qué reto"
        hint="Escribe la duración («30 días») y los escudos («2 escudos»): se detectan solos y puedes corregirlos abajo."
        error={titleError ?? serverError ?? undefined}
      >
        {(p) => (
          <Input
            {...p}
            ref={titleRef}
            autoFocus
            name="reto"
            enterKeyHint="done"
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Leer 20 minutos 30 días 2 escudos"
            aria-invalid={titleError ? true : undefined}
            autoComplete="off"
          />
        )}
      </Field>

      {/* Solo la duración y los escudos se anuncian (el nombre cambiaría con cada tecla). */}
      <p aria-live="polite" className="sr-only">
        {days} {days === 1 ? 'día' : 'días'}, {effectiveShields} {effectiveShields === 1 ? 'escudo' : 'escudos'}
      </p>
      <ul aria-label="Lo que se ha entendido" className="flex flex-wrap gap-1.5">
        <li className={cn(CHIP, title ? 'bg-accent-soft text-accent-text' : 'bg-border text-text-muted')}>{title || 'Sin nombre'}</li>
        <li className={cn(CHIP, detected.days ? 'bg-accent-soft text-accent-text' : 'bg-border text-text-muted')}>
          {days} {days === 1 ? 'día' : 'días'}
        </li>
        <li className={cn(CHIP, detected.shields ? 'bg-accent-soft text-accent-text' : 'bg-border text-text-muted')}>
          {effectiveShields} {effectiveShields === 1 ? 'escudo' : 'escudos'}
        </li>
        <li className={cn(CHIP, 'bg-border text-text-muted')}>Empieza hoy</li>
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span id={`${daysId}-duracion`} className="text-xs font-medium text-text-muted">
            Duración
          </span>
          <div role="group" aria-labelledby={`${daysId}-duracion`} className="flex flex-wrap gap-1.5">
            {PRESETS.map((n) => (
              <Button key={n} type="button" size="sm" variant={days === n && daysValid ? 'primary' : 'secondary'} aria-pressed={days === n && daysValid} onClick={() => applyDays(n)}>
                {n} días
              </Button>
            ))}
          </div>
        </div>

        <Field label="Días" error={daysError}>
          {(p) => (
            <Input
              {...p}
              ref={daysRef}
              name="dias"
              type="number"
              inputMode="numeric"
              min={MIN_DURATION_DAYS}
              max={MAX_DURATION_DAYS}
              value={daysRaw}
              onChange={(e) => onDaysInput(e.target.value)}
              aria-invalid={daysError ? true : undefined}
              className="tabular-nums"
            />
          )}
        </Field>

        <Field label="Termina el">
          {(p) => (
            <Input
              {...p}
              name="fin"
              type="date"
              min={today}
              max={endDateFor(today, MAX_DURATION_DAYS)}
              value={daysValid ? endDate : ''}
              onChange={(e) => onEndDate(e.target.value)}
              className="tabular-nums"
            />
          )}
        </Field>

        <div className="flex flex-col gap-1.5">
          <span id={`${daysId}-escudos`} className="text-xs font-medium text-text-muted">
            Escudos
          </span>
          <div role="group" aria-labelledby={`${daysId}-escudos`} className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" aria-label="Un escudo menos" disabled={effectiveShields <= 0} onClick={() => stepShields(-1)}>
              <Minus size={14} strokeWidth={2} aria-hidden="true" />
            </Button>
            <output aria-live="polite" className="w-6 text-center text-ui font-medium tabular-nums text-text">
              {effectiveShields}
            </output>
            <Button type="button" size="sm" variant="secondary" aria-label="Un escudo más" disabled={effectiveShields >= MAX_SHIELDS} onClick={() => stepShields(1)}>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
      <p className="-mt-1 text-xs text-text-muted">Un escudo cubre un día que no marques, sin romper la racha. No se recargan durante el reto.</p>

      {daysValid && (
        <section aria-label="Vista previa" className="space-y-2 rounded-md border border-border bg-bg-soft p-3">
          <p className="text-ui text-text">
            Del <strong className="font-semibold">{formatDayMonth(today)}</strong> al <strong className="font-semibold">{formatDayMonth(endDate)}</strong> ·{' '}
            <span className="tabular-nums">
              {days} {days === 1 ? 'día' : 'días'} · {effectiveShields} {effectiveShields === 1 ? 'escudo' : 'escudos'}
            </span>
          </p>
          <ol aria-hidden="true" className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(days, PREVIEW_MARKS) }, (_, i) => (
              <li key={i}>
                <DayMark visual={i === 0 ? 'today' : 'upcoming'} />
              </li>
            ))}
            {days > PREVIEW_MARKS && <li className="text-xs text-text-faint">…</li>}
          </ol>
          {gamified && (
            <p className="text-xs tabular-nums text-text-muted">
              +{XP_PER_CHALLENGE_DAY} XP por día hecho · +{challengePerfectBonus(days)} XP si no fallas ningún día
            </p>
          )}
        </section>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Crear reto <Kbd className="bg-on-accent/20 text-on-accent">Enter</Kbd>
        </Button>
      </div>
    </form>
  )
}
