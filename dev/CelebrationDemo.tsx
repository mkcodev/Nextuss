// Componente de la demo de Celebration (ver celebration.tsx).
import { useState } from 'react'
import { Badge, Button, Card, Celebration, Checkbox } from '../src/design/primitives'

const params = new URLSearchParams(location.search)
const TAREAS = ['Revisar el presupuesto del trimestre', 'Llamar al dentista', 'Preparar la demo del viernes']

function Fila({ titulo, auto }: { titulo: string; auto: boolean }) {
  const [hecha, setHecha] = useState(false)
  const [play, setPlay] = useState<number | null>(null)
  if (auto && play === null && !hecha) {
    setHecha(true)
    setPlay(1)
  }
  return (
    <div className="relative flex min-h-row items-center gap-3 border-t py-1.5 border-border px-3 first:border-t-0">
      <Checkbox
        checked={hecha}
        onChange={() => {
          setHecha(!hecha)
          if (!hecha) setPlay((n) => (n ?? 0) + 1)
        }}
        aria-label={`Completar «${titulo}»`}
      />
      <span className={hecha ? 'flex-1 text-text-faint line-through' : 'flex-1 text-text'}>{titulo}</span>
      <Badge tone="accent">Hoy</Badge>
      <Celebration play={play} />
    </div>
  )
}

export function Demo() {
  return (
    <main className="min-h-screen bg-bg p-8 text-text">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Celebration</h1>
      <p className="mb-5 text-text-muted">Destello de acento y barrido del borde inferior, 700 ms. Marca una tarea.</p>
      <Card className="max-w-xl overflow-hidden">
        {TAREAS.map((t, i) => (
          <Fila key={t} titulo={t} auto={params.has('auto') && i === 1} />
        ))}
      </Card>
      <div className="mt-4">
        <Button variant="secondary" onClick={() => location.reload()}>
          Reiniciar
        </Button>
      </div>
    </main>
  )
}

