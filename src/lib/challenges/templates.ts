// Plantillas de retos propios del estado vacío de /retos. «Usar» rellena el formulario de crear.

export interface ChallengeTemplate {
  id: string
  title: string
  days: number
  shields: number
}

export const CHALLENGE_TEMPLATES: readonly ChallengeTemplate[] = [
  { id: 'leer', title: 'Leer 20 minutos', days: 30, shields: 2 },
  { id: 'sin-azucar', title: 'Sin azúcar añadido', days: 21, shields: 1 },
  { id: 'diario', title: 'Escribir tres líneas de diario', days: 66, shields: 3 },
]
