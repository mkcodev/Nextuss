import { forwardRef, useId } from 'react'

interface TitleFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Mensaje de error; si existe, el campo se marca inválido y lo anuncia. */
  error?: string
  autoFocus?: boolean
}

/** Campo principal de un formulario (título de tarea, nombre de proyecto…): grande y sin caja; al
 *  enfocarlo aparece la línea inferior. La etiqueta existe para lectores de pantalla. */
export const TitleField = forwardRef<HTMLInputElement, TitleFieldProps>(function TitleField(
  { label, value, onChange, placeholder, error, autoFocus },
  ref,
) {
  const id = useId()
  const errorId = useId()
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        autoFocus={autoFocus}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="field-bare w-full border-b border-transparent bg-transparent pb-1 text-xl font-semibold tracking-tight text-text placeholder:text-text-muted focus:border-border aria-invalid:border-danger"
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

interface NotesFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}

/** Notas o descripción bajo el campo principal, también sin caja. */
export function NotesField({ label, value, onChange, placeholder }: NotesFieldProps) {
  const id = useId()
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={value.split('\n').length > 2 ? 4 : 2}
        className="field-bare mt-2 w-full resize-none border-b border-transparent bg-transparent text-sm text-text placeholder:text-text-muted focus:border-border"
      />
    </>
  )
}
