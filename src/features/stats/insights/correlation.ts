export interface CorrelationResult {
  r: number // -1..1
  n: number
  strengthLabel: 'fuerte' | 'moderada' | 'débil' | 'ninguna'
}

function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

/** Pearson sobre pares alineados por índice. Menos de 3 pares se trata como "sin correlación". */
export function pearsonCorrelation(xs: number[], ys: number[]): CorrelationResult {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return { r: 0, n, strengthLabel: 'ninguna' }

  const xsSlice = xs.slice(0, n)
  const ysSlice = ys.slice(0, n)
  const meanX = average(xsSlice)
  const meanY = average(ysSlice)

  let num = 0
  let denX = 0
  let denY = 0
  for (let i = 0; i < n; i++) {
    const dx = xsSlice[i] - meanX
    const dy = ysSlice[i] - meanY
    num += dx * dy
    denX += dx * dx
    denY += dy * dy
  }

  const den = Math.sqrt(denX * denY)
  const r = den === 0 ? 0 : num / den
  const abs = Math.abs(r)
  const strengthLabel = abs >= 0.6 ? 'fuerte' : abs >= 0.35 ? 'moderada' : abs >= 0.15 ? 'débil' : 'ninguna'

  return { r, n, strengthLabel }
}
