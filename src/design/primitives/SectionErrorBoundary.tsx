import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface SectionErrorBoundaryProps {
  children: ReactNode
  /** Al cambiar (p. ej. otro panel en el mismo hueco) el límite se reinicia solo. */
  resetKey?: unknown
  /** Nombre de la sección para el mensaje ("No se pudo cargar {label}"). */
  label?: string
}

interface State {
  error: Error | null
}

/** Límite de error para una región independiente (un panel del dock): si su render o una
 * `useLiveQuery` lanza, solo cae esa región y no la página entera (`RouteErrorBoundary`). */
export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SectionErrorBoundary', error, info.componentStack)
  }

  componentDidUpdate(prev: SectionErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset()
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex flex-col items-center gap-2 p-4 text-center">
        <AlertTriangle size={20} strokeWidth={1.75} className="text-danger" />
        <p className="text-xs font-medium text-text">
          No se pudo cargar {this.props.label ?? 'esta sección'}
        </p>
        <p className="max-w-full truncate text-xs text-text-faint">{this.state.error.message}</p>
        <Button variant="secondary" onClick={this.reset} className="h-7 px-2 py-0 text-xs">
          <RefreshCw size={12} strokeWidth={1.75} /> Reintentar
        </Button>
      </div>
    )
  }
}
