import type { Detector } from '../types'

export const zombieAccumulation: Detector = (ctx) => {
  if (ctx.zombieCount === 0) return null

  return {
    key: 'zombieAccumulation',
    title: ctx.zombieCount === 1 ? 'Tienes una tarea zombie' : `Tienes ${ctx.zombieCount} tareas zombie`,
    body: 'Llevan pospuestas 3 veces o más. O las haces, o las rompes en algo más pequeño, o las sueltas — dejarlas ahí solo pesa.',
    severity: ctx.zombieCount >= 3 ? 'warn' : 'neutral',
    confidence: Math.min(1, ctx.zombieCount / 5),
  }
}
