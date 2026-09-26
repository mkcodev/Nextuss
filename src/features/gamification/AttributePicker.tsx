import { useId, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Select } from '../../design/primitives'
import { useAttributesWithCreate } from './useAttributesWithCreate'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

interface AttributePickerProps {
  value: number | undefined
  onChange: (id: number | undefined) => void
  /** id para el `<label htmlFor>` de la fila que lo contiene. */
  id?: string
}

/** Elegir el atributo al que suma XP (proyecto, hábito) o crear uno nuevo al vuelo. El campo de
 *  "nuevo atributo" se abre bajo demanda y Enter lo crea sin enviar el formulario. */
export function AttributePicker({ value, onChange, id }: AttributePickerProps) {
  const { attributes, createAndSelect } = useAttributesWithCreate()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const fallbackId = useId()
  const newButton = useRef<HTMLButtonElement>(null)
  const inputId = id ?? fallbackId

  // Al volver al selector, el foco vuelve al botón "Nuevo" (si no, caía a <body>).
  const stopCreating = () => {
    setCreating(false)
    requestAnimationFrame(() => newButton.current?.focus())
  }

  const [pending, create] = useSubmitGuard(async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onChange(await createAndSelect(trimmed))
    setName('')
    stopCreating()
  })

  if (creating) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Mismo id que el selector: la etiqueta de la fila sigue apuntando a un campo. */}
        <label htmlFor={inputId} className="sr-only">
          Nombre del nuevo atributo
        </label>
        <input
          id={inputId}
          autoFocus
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void create()
            }
            if (e.key === 'Escape') {
              e.stopPropagation()
              stopCreating()
            }
          }}
          placeholder="Ej.: Salud…"
          className="h-8 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent"
        />
        <Button type="button" size="sm" loading={pending} onClick={() => void create()}>
          Crear atributo
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={stopCreating}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select id={inputId} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}>
        <option value="">Sin atributo</option>
        {attributes.map((attr) => (
          <option key={attr.id} value={attr.id}>
            {attr.name}
          </option>
        ))}
      </Select>
      <Button ref={newButton} type="button" size="sm" variant="ghost" onClick={() => setCreating(true)} className="shrink-0">
        <Plus size={14} strokeWidth={2} /> Nuevo
      </Button>
    </div>
  )
}
