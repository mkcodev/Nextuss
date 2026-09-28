import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Command, Compass, Inbox, MousePointerClick, Plus, Sparkles, Target } from 'lucide-react'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'
import { generateDemoData } from '../../db/demoSeed'
import { Button, Dialog, Input, Kbd } from '../../design/primitives'
import { useQuickAddStore } from '../tasks/quickAddStore'
import { useToastStore } from '../../lib/toastStore'
import { useStage } from '../../app/stage/stageStore'

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
  { icon: Plus, keys: 'n', text: 'Nueva tarea desde cualquier pantalla («mañana 10:00 !1 30m»).' },
  { icon: Inbox, keys: 'i', text: 'Apunta una idea en la bandeja de Captura, sin pensar dónde va.' },
  { icon: MousePointerClick, keys: 'g h / g p / g b', text: 'Salta a Hoy, Planificación o Hábitos.' },
]

export function OnboardingFlow() {
  const { show: wanted } = useOnboardingGate()
  const show = useStage('onboarding', wanted)
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [choice, setChoice] = useState<DataChoice>(null)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)
  const push = useToastStore((s) => s.push)

  const finish = () => {
    void updateSettings({ onboardingCompleted: true })
    if (choice === 'fresh') {
      // Lo primero es saber qué hacer hoy: la primera tarea, no un hábito. Pequeño retardo para que
      // este diálogo se desmonte antes de que monte el de la tarea rápida.
      setTimeout(() => openQuickAdd(), 50)
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
    <Dialog open={show} onClose={skip} title="Bienvenida a Nextuss" hideTitle>
      <div className="mb-4 flex justify-center gap-1.5">
        {(['welcome', 'choice', 'tips'] as Step[]).map((s) => (
          <span key={s} className={`h-1 w-6 rounded-full ${s === step ? 'bg-accent' : 'bg-border-strong'}`} />
        ))}
      </div>

      {step === 'welcome' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-md bg-accent-soft text-accent">
            <Target size={26} strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-balance text-text">Te damos la bienvenida a Nextuss</h1>
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
            aria-label="Tu nombre (opcional)"
            autoComplete="given-name"
            autoFocus
          />
          <Button type="button" className="w-full" onClick={commitName}>
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
              type="button"
              onClick={chooseFresh}
              disabled={loadingDemo}
              className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
            >
              <Compass size={22} strokeWidth={1.75} className="text-accent" />
              <span className="text-sm font-medium text-text">Empezar de cero</span>
              <span className="text-sm text-text-muted">Apuntas lo primero que quieres hacer hoy</span>
            </button>
            <button
              type="button"
              onClick={chooseDemo}
              disabled={loadingDemo}
              className="flex flex-col items-center gap-2 rounded-md border border-border p-4 text-center transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-50"
            >
              <Sparkles size={22} strokeWidth={1.75} className="text-accent" />
              <span className="text-sm font-medium text-text">Ver con datos de ejemplo</span>
              <span className="text-sm text-text-muted">Unos 6 meses inventados que puedes borrar cuando quieras</span>
            </button>
          </div>
          {loadingDemo && <p role="status" className="text-center text-sm text-text-muted">Generando datos de ejemplo…</p>}
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
              <li key={keys} className="flex items-center gap-3 rounded-md border border-border p-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-accent-soft text-accent">
                  <TipIcon size={15} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1 text-sm text-text-muted">{text}</span>
                <Kbd className="shrink-0">{keys}</Kbd>
              </li>
            ))}
          </ul>
          <Button type="button" className="w-full" onClick={finish}>
            {choice === 'fresh' ? 'Añadir mi primera tarea' : 'Empezar a usar Nextuss'}
          </Button>
        </div>
      )}

      {step !== 'tips' && (
        <button type="button" onClick={skip} className="mt-4 w-full text-center text-sm text-text-muted hover:text-text">
          Saltar la bienvenida
        </button>
      )}
    </Dialog>
  )
}
