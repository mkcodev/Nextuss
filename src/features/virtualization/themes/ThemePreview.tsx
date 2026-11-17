// Miniatura CSS del tema de la Virtualización, para el selector de Ajustes (#98 P7). Los temas reales
// (ThemeA/B/C) son Canvas de React Three Fiber — nada de 3D aquí, solo una pista visual barata y
// estática de cada uno: Nítido (anillo neto), Orgánico (mancha difusa) y Terminal (línea de prompt).
export function ThemePreview({ value }: { value: string }) {
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden rounded-sm bg-[#0b0d12]">
      {value === 'a' && <span className="size-6 rounded-full border-2 border-[#8fd3ff]" aria-hidden="true" />}
      {value === 'b' && (
        <span
          className="size-7 rounded-full blur-[3px]"
          style={{ background: 'radial-gradient(circle at 35% 35%, #ffd8a8, #ff8fa3 60%, transparent 80%)' }}
          aria-hidden="true"
        />
      )}
      {value === 'c' && (
        <span className="font-mono text-[10px] leading-tight text-[#5ee694]" aria-hidden="true">
          &gt; listo_
        </span>
      )}
    </div>
  )
}
