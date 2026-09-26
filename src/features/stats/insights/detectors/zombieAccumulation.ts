import type { Detector } from '../types'

export const zombieAccumulation: Detector = (ctx) => {
  if (ctx.zombieCount === 0) return null

  return {
    key: 'zombieAccumulation',
    title: ctx.zombieCount === 1 ? 'Una tarea lleva tiempo aplazándose' : `${ctx.zombieCount} tareas llevan tiempo aplazándose`,
    body: 'Se han pospuesto 3 veces o más. Puedes partirlas en algo más pequeño, aparcarlas o soltarlas: cualquiera vale.',
    severity: ctx.zombieCount >= 3 ? 'warn' : 'neutral',
    confidence: Math.min(1, ctx.zombieCount / 5),
  }
}
