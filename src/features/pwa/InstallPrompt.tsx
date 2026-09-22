import { Download, MonitorCheck } from 'lucide-react'
import { Button, Card } from '../../design/primitives'
import { useInstallPrompt } from './useInstallPrompt'

export function InstallPrompt() {
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  if (installed) {
    return (
      <Card className="p-4">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
          <MonitorCheck size={15} strokeWidth={1.75} /> Instalación
        </h2>
        <p className="text-xs text-text-faint">Nexus ya está instalado como app.</p>
      </Card>
    )
  }

  if (!canInstall) return null

  return (
    <Card className="p-4">
      <h2 className="mb-1 text-sm font-semibold text-text">Instalación</h2>
      <p className="mb-3 text-xs text-text-faint">
        Instala Nexus como app para abrirlo desde tu escritorio o pantalla de inicio, sin la barra del navegador.
      </p>
      <Button variant="secondary" onClick={promptInstall}>
        <Download size={14} strokeWidth={1.75} /> Instalar Nexus
      </Button>
    </Card>
  )
}
