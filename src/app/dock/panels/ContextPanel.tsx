import { PanelRight } from 'lucide-react'
import { EmptyState } from '../../../design/primitives'
import { useContextPanelStore } from '../contextPanelStore'

export function ContextPanel() {
  const { title, content } = useContextPanelStore()

  if (!content) {
    return (
      <EmptyState
        icon={PanelRight}
        title="Sin contenido contextual"
        description="Esta página no aporta nada a este panel — prueba en Hoy o Hábitos."
        className="p-4"
      />
    )
  }

  return (
    <div>
      {title && (
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-text-faint">
          {title}
        </p>
      )}
      {content}
    </div>
  )
}
