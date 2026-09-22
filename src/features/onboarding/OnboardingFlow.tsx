import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'framer-motion'
import { Command, Compass, LayoutPanelLeft, MousePointerClick, Sparkles, Target, Zap } from 'lucide-react'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { generateDemoData } from '../../db/demoSeed'
import { Button, Input, Kbd } from '../../design/primitives'
import { useHabitFormStore } from '../habits/habitFormStore'
import { useToastStore } from '../../lib/toastStore'

type Step = 'welcome' | 'choice' | 'tips'
type DataChoice = 'fresh' | 'demo' | null

function useOnboardingGate() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const counts = useLiveQuery(
    () => Promise.all([db.habits.count(), db.tasks.count(), db.goals.count()]),
    [],
  )

  const loaded = settings !== undefined && counts !== undefined
  const isEmpty = counts ? counts.every((c) => c === 0) : false
  const needsSilentFlag = loaded && !settings!.onboardingCompleted && !isEmpty

  // An existing install (real data, no flag yet) silently earns the flag instead of ever seeing this.
  useEffect(() => {
    if (needsSilentFlag) void updateSettings({ onboardingCompleted: true })
  }, [needsSilentFlag])

  return { show: loaded && !settings!.onboardingCompleted && isEmpty }
}

const TIPS = [
  { icon: Command, keys: '⌘K / Ctrl+K', text: 'Paleta de comandos: busca y ejecuta cualquier cosa.' },
  { icon: Zap, keys: 'i', text: 'Captura rápida desde cualquier pantalla, sin pensar en dónde va.' },
  { icon: MousePointerClick, keys: 'g h / g p / g b', text: 'Salta a Hoy, Planificación o Hábitos.' },
  { icon: LayoutPanelLeft, keys: 'Alt+L', text: 'Muestra u oculta el panel lateral derecho.' },
]

export function OnboardingFlow() {
  const { show } = useOnboardingGate()
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [choice, setChoice] = useState<DataChoice>(null)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const openHabitCreate = useHabitFormStore((s) => s.openCreate)
  const push = useToastStore((s) => s.push)
  const reduceMotion = useReducedMotion()

  if (!show) return null

  const finish = () => {
    void updateSettings({ onboardingCompleted: true })
    if (choice === 'fresh') {
      // Small delay so this dialog is fully gone before the habit form's own dialog mounts.
      setTimeout(() => openHabitCreate(), 50)
    }
  }

  const skip = () => void updateSettings({ onboardingCompleted: true })

  const chooseFresh = () => {
    setChoice('fresh')
    setStep('tips')
  }

  const chooseDemo = async () => {
    setChoice('demo')
    setLoadingDemo(true)
    try {
      const result = await generateDemoData()
      push({
        title: 'Datos de ejemplo generados',
        description: `${result.habits} hábitos, ${result.tasks} tareas, ${result.goals} objetivos, ~6 meses`,
        icon: 'sparkles',
        variant: 'celebrate',
      })
      setStep('tips')
    } catch {
      push({ title: 'No se pudieron generar los datos de ejemplo', variant: 'error' })
    } finally {
      setLoadingDemo(false)
    }
  }

  const commitName = () => {
    if (name.trim()) void updateSettings({ displayName: name.trim() })
    setStep('choice')
  }

  return (
    <div className="fixed inset-0 z-dialog flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida a Nexus"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.18 }}
        className="w-full max-w-md rounded-2xl border border-border bg-bg-soft p-6 shadow-card"
      >
        <div className="mb-4 flex justify-center gap-1.5">
          {(['welcome', 'choice', 'tips'] as Step[]).map((s) => (
            <span key={s} className={`h-1.5 w-6 rounded-full ${s === step ? 'bg-accent' : 'bg-border'}`} />
          ))}
        </div>

        {step === 'welcome' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Target size={26} strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text">Bienvenido a Nexus</h1>
              <p className="mt-1 text-sm text-text-muted">
                Tu centro de mando personal: hábitos, planificación, captura y estadísticas. Todo
                local, sin cuenta, sin conexión.
              </p>
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
              placeholder="¿Cómo te llamas? (opcional)"
              autoFocus
            />
            <Button className="w-full" onClick={commitName}>
              Continuar
            </Button>
          </div>
        )}

        {step === 'choice' && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-text">¿Cómo quieres empezar?</h1>
              <p className="mt-1 text-sm text-text-muted">Puedes cambiarlo más tarde desde Ajustes.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={chooseFresh}
                disabled={loadingDemo}
                className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
              >
                <Compass size={22} strokeWidth={1.75} className="text-accent" />
                <span className="text-sm font-medium text-text">Empezar de cero</span>
                <span className="text-[11px] text-text-faint">Creas tu primer hábito ahora mismo</span>
              </button>
              <button
                onClick={chooseDemo}
                disabled={loadingDemo}
                className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
              >
                <Sparkles size={22} strokeWidth={1.75} className="text-accent" />
                <span className="text-sm font-medium text-text">Ver con datos de ejemplo</span>
                <span className="text-[11px] text-text-faint">~6 meses generados, se borran cuando quieras</span>
              </button>
            </div>
            {loadingDemo && <p className="text-center text-xs text-text-faint">Generando datos de ejemplo…</p>}
          </div>
        )}

        {step === 'tips' && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-text">Cuatro atajos para empezar</h1>
              <p className="mt-1 text-sm text-text-muted">El resto están en el modal de ayuda (tecla ?).</p>
            </div>
            <ul className="space-y-2.5">
              {TIPS.map(({ icon: TipIcon, keys, text }) => (
                <li key={keys} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <TipIcon size={15} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-xs text-text-muted">{text}</span>
                  <Kbd className="shrink-0">{keys}</Kbd>
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={finish}>
              {choice === 'fresh' ? 'Crear mi primer hábito' : 'Empezar a usar Nexus'}
            </Button>
          </div>
        )}

        {step !== 'tips' && (
          <button onClick={skip} className="mt-4 w-full text-center text-xs text-text-faint hover:text-text-muted">
            Saltar la bienvenida
          </button>
        )}
      </motion.div>
    </div>
  )
}
