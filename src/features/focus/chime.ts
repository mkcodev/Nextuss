// Dos tonos cortos sintetizados con Web Audio — nada de asset de audio que descargar/empaquetar.
export function playChime(): void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  const ctx = new Ctx()
  const tone = (freq: number, startAt: number, durationSec: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(0.2, startAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + durationSec)
  }
  const now = ctx.currentTime
  tone(880, now, 0.18)
  tone(1175, now + 0.16, 0.22)
  setTimeout(() => void ctx.close(), 600)
}
