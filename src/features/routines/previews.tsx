// Miniaturas CSS de los selectores de vista de Rutinas (#98 P7) — no reusan `RoutinePlayer`/
// `StepKinds` (pensados para pantalla completa, demasiado grandes para una miniatura), solo evocan su
// forma: un paso único a pantalla completa vs. una línea de pasos, y 3 maquetas de cómo se ve un paso
// con texto (sin chrome / tarjeta / diario).
export function RoutineViewPreview({ value }: { value: string }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-sm bg-bg-soft p-1.5">
      {value === 'step' && <span className="h-6 w-8 rounded-sm border-2 border-accent" aria-hidden="true" />}
      {value === 'timeline' && (
        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-border-strong" />
          <span className="h-px w-2.5 bg-border-strong" />
          <span className="size-2 rounded-full bg-accent" />
          <span className="h-px w-2.5 bg-border-strong" />
          <span className="size-1.5 rounded-full bg-border-strong" />
          <span className="h-px w-2.5 bg-border-strong" />
          <span className="size-1.5 rounded-full bg-border-strong" />
        </div>
      )}
    </div>
  )
}

export function RoutineStepStylePreview({ value }: { value: string }) {
  return (
    <div className="grid h-full w-full place-items-center rounded-sm bg-bg-soft p-1.5">
      {value === 'direct' && (
        <div className="w-10 space-y-1" aria-hidden="true">
          <span className="block h-1 w-full rounded-full bg-text-muted" />
          <span className="block h-1 w-7 rounded-full bg-border-strong" />
        </div>
      )}
      {value === 'card' && (
        <div className="w-10 space-y-1 rounded-sm border border-border bg-surface p-1" aria-hidden="true">
          <span className="block h-1 w-full rounded-full bg-text-muted" />
          <span className="block h-1 w-6 rounded-full bg-border-strong" />
        </div>
      )}
      {value === 'journal' && (
        <div className="relative w-10 space-y-1 rounded-sm border border-border bg-surface py-1 pr-1 pl-2.5" aria-hidden="true">
          <span className="absolute top-0.5 bottom-0.5 left-1.5 w-px bg-danger/50" />
          <span className="block h-1 w-full rounded-full bg-text-muted" />
          <span className="block h-1 w-6 rounded-full bg-border-strong" />
        </div>
      )}
    </div>
  )
}
