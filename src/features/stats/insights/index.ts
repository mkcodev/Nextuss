import { weekdayEffect } from './detectors/weekdayEffect'
import { energyVsOutput } from './detectors/energyVsOutput'
import { moodVsHabits } from './detectors/moodVsHabits'
import { bestFocusHour } from './detectors/bestFocusHour'
import { estimateBias } from './detectors/estimateBias'
import { habitAtRisk } from './detectors/habitAtRisk'
import { zombieAccumulation } from './detectors/zombieAccumulation'
import { goalCompletionRate } from './detectors/goalCompletionRate'
import { interruptionTrend } from './detectors/interruptionTrend'
import { overcommitment } from './detectors/overcommitment'
import { streakFragility } from './detectors/streakFragility'
import { weekendCliff } from './detectors/weekendCliff'
import { newHabitStalling } from './detectors/newHabitStalling'
import { recoverySpeed } from './detectors/recoverySpeed'
import type { Detector, Insight, InsightContext } from './types'

export const DETECTORS: Detector[] = [
  weekdayEffect,
  energyVsOutput,
  moodVsHabits,
  bestFocusHour,
  estimateBias,
  habitAtRisk,
  zombieAccumulation,
  goalCompletionRate,
  interruptionTrend,
  overcommitment,
  streakFragility,
  weekendCliff,
  newHabitStalling,
  recoverySpeed,
]

const SEVERITY_WEIGHT: Record<Insight['severity'], number> = { warn: 3, good: 2, neutral: 1 }

/** Corre todos los detectores y ordena por severidad × confianza (los más urgentes/seguros primero). */
export function evaluateInsights(ctx: InsightContext): Insight[] {
  return DETECTORS.map((detector) => detector(ctx))
    .filter((insight): insight is Insight => insight != null)
    .sort((a, b) => SEVERITY_WEIGHT[b.severity] * b.confidence - SEVERITY_WEIGHT[a.severity] * a.confidence)
}

export type { Detector, Insight, InsightContext, InsightAction, InsightEvidence, InsightSeverity } from './types'
