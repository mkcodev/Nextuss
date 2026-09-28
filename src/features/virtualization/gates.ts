// La puerta de la Virtualización para su lanzador integrado (patrón `dayStartGate.ts`). De momento
// siempre abre: el interruptor de activar/desactivar y la ventana horaria llegan en el PR de Ajustes
// (#97 PR4), que añadirá los campos `virtualizationEnabled`/`virtualizationWindowEndHour` a `Settings`.
export async function shouldOpenVirtualizationOn(_date: string): Promise<boolean> {
  return true
}
