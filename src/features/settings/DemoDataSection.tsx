import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Database, Sparkles, Trash2 } from 'lucide-react'
import { Button, Card, Dialog } from '../../design/primitives'
import { clearDemoData, generateDemoData, isDemoDataPresent } from '../../db/demoSeed'
import { useToastStore } from '../../lib/toastStore'

export function DemoDataSection() {
  const demoPresent = useLiveQuery(() => isDemoDataPresent(), []) ?? false
  const [confirming, setConfirming] = useState<'generate' | 'clear' | null>(null)
  const [busy, setBusy] = useState(false)
  const push = useToastStore((s) => s.push)

  const runGenerate = async () => {
    setBusy(true)
    try {
      const result = await generateDemoData()
      push({
        title: 'Datos de ejemplo generados',
        description: `${result.habits} hábitos, ${result.tasks} tareas, ${result.goals} objetivos, ~6 meses`,
        icon: 'sparkles',
        variant: 'celebrate',
      })
    } catch (err) {
      push({ title: 'No se pudieron generar', description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const runClear = async () => {
    setBusy(true)
    try {
      await clearDemoData()
      push({ title: 'Datos de ejemplo borrados' })
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <Database size={15} strokeWidth={1.75} /> Datos
      </h2>
      <p className="mb-3 text-xs text-text-faint">
        Genera ~6 meses de datos de ejemplo para ver los gráficos y las estadísticas en acción. No
        afecta a tus datos reales y puedes borrarlos cuando quieras.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={demoPresent || busy} onClick={() => setConfirming('generate')}>
          <Sparkles size={14} strokeWidth={1.75} /> Generar 6 meses de ejemplo
        </Button>
        <Button variant="secondary" disabled={!demoPresent || busy} onClick={() => setConfirming('clear')}>
          <Trash2 size={14} strokeWidth={1.75} /> Borrar datos de ejemplo
        </Button>
      </div>

      <Dialog
        open={confirming != null}
        onClose={() => setConfirming(null)}
        title={confirming === 'generate' ? 'Generar datos de ejemplo' : 'Borrar datos de ejemplo'}
      >
        <p className="text-sm text-text-muted">
          {confirming === 'generate'
            ? 'Se crearán hábitos, tareas, objetivos y check-ins de ejemplo (~6 meses). No toca tus datos reales.'
            : 'Se eliminará todo lo generado por "Generar 6 meses de ejemplo". Tus datos reales no se tocan.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={confirming === 'clear' ? 'danger' : 'primary'}
            onClick={confirming === 'generate' ? runGenerate : runClear}
            disabled={busy}
          >
            {busy ? 'Un momento…' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>
    </Card>
  )
}
