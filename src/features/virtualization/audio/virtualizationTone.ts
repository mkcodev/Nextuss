// Audio sintetizado de la Virtualización (Web Audio, sin archivos) — puerto del `ToneAudio` de
// `docs/design/virtualizacion/shared.js`, compartido por los 3 temas. Silenciable con `setMuted`.
class ToneAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private humOsc: OscillatorNode | null = null
  private humGain: GainNode | null = null
  private muted = false

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.28
    this.master.connect(this.ctx.destination)
    return this.ctx
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    const ctx = this.ensure()
    if (ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.28, ctx.currentTime, 0.05)
  }

  /** Tono corto sintetizado (transición de fase, beep de escaneo, destello final…). */
  tone(freq: number, startAt: number, durationSec: number, type: OscillatorType = 'sine', peak = 0.5): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, startAt)
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(peak, startAt + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(startAt)
    osc.stop(startAt + durationSec)
  }

  /** Zumbido grave y continuo de la Cabina; se enciende/apaga con un fundido corto. */
  hum(on: boolean): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    if (on) {
      if (this.humOsc) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 55
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(this.master)
      osc.start()
      this.humOsc = osc
      this.humGain = gain
    } else if (this.humOsc) {
      const osc = this.humOsc
      this.humGain?.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
      setTimeout(() => osc.stop(), 400)
      this.humOsc = null
    }
  }

  /** Pitido corto en "ahora" (entrada a una fase, confirmación). */
  beep(freq: number, durationSec = 0.18): void {
    const ctx = this.ensure()
    if (!ctx) return
    this.tone(freq, ctx.currentTime, durationSec)
  }

  /** Barrido ascendente de la Transmisión. */
  sweep(): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(1400, now + 1.4)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + 1.4)
  }

  /** Barrido descendente para el destello de materialización de la Virtualización. */
  whoosh(): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(900, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.9)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.16, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(now)
    osc.stop(now + 0.9)
  }

  /** Acorde corto (tónica + quinta + octava) al completar el ritual. */
  chord(): void {
    const ctx = this.ensure()
    if (!ctx) return
    const now = ctx.currentTime
    this.tone(220, now, 1.1, 'sine', 0.3)
    this.tone(330, now, 1.1, 'sine', 0.22)
    this.tone(440, now, 1.1, 'sine', 0.18)
  }

  close(): void {
    this.hum(false)
    void this.ctx?.close()
    this.ctx = null
    this.master = null
  }
}

export const virtualizationTone = new ToneAudio()
