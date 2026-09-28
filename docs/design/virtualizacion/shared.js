// Motor compartido de los 3 prototipos de Virtualización (issue #97). Cada variante solo aporta
// paleta, geometría y qué pases de postprocesado usar; esto monta el canvas, el bucle de render, el
// audio sintetizado (Web Audio, sin archivos) y el overlay de fases con controles de desarrollo.
// Prototipo desechable para decidir estilo — la implementación real será con React Three Fiber (#97).
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js'

export const PHASES = ['cabina', 'transmision', 'escaneo', 'presencia', 'virtualizacion']
export const PHASE_LABELS = { cabina: 'Cabina', transmision: 'Transmisión', escaneo: 'Escaneo', presencia: 'Presencia', virtualizacion: 'Virtualización' }

class ToneAudio {
  constructor() { this.ctx = null; this.muted = false; this.master = null; this.humOsc = null; this.humGain = null }
  ensure() {
    if (this.ctx) return
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.28
    this.master.connect(this.ctx.destination)
  }
  setMuted(m) { this.muted = m; this.ensure(); this.master.gain.setTargetAtTime(m ? 0 : 0.28, this.ctx.currentTime, 0.05) }
  tone(freq, start, dur, type = 'sine', peak = 0.5) {
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain); gain.connect(this.master)
    osc.start(start); osc.stop(start + dur)
  }
  hum(on) {
    this.ensure()
    if (on) {
      if (this.humOsc) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 55
      gain.gain.value = 0.05
      osc.connect(gain); gain.connect(this.master)
      osc.start()
      this.humOsc = osc; this.humGain = gain
    } else if (this.humOsc) {
      const osc = this.humOsc
      this.humGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2)
      setTimeout(() => osc.stop(), 400)
      this.humOsc = null
    }
  }
  sweep() {
    this.ensure()
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(1400, now + 1.4)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4)
    osc.connect(gain); gain.connect(this.master)
    osc.start(now); osc.stop(now + 1.4)
  }
  whoosh() {
    this.ensure()
    const now = this.ctx.currentTime
    const n = this.ctx.sampleRate * 0.8
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(300, now)
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.8)
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    noise.connect(filter); filter.connect(gain); gain.connect(this.master)
    noise.start(now)
  }
  chord() {
    this.ensure()
    const now = this.ctx.currentTime
    for (const f of [261.6, 329.6, 392.0, 523.3]) this.tone(f, now, 1.8, 'sine', 0.16)
  }
  beep(freq = 880) { this.ensure(); this.tone(freq, this.ctx.currentTime, 0.15, 'sine', 0.3) }
}

const BREATH_PATTERN = [{ label: 'Inspira', sec: 4 }, { label: 'Sostén', sec: 4 }, { label: 'Suelta', sec: 4 }, { label: 'Sostén', sec: 4 }]
const BREATH_TOTAL = BREATH_PATTERN.reduce((s, p) => s + p.sec, 0)
const SYNC_DURATION = 32 // s hasta 100% en el prototipo (patrón real será configurable)

export function createPrototype(variant) {
  const canvas = document.getElementById('scene')
  const root = document.documentElement
  Object.entries(variant.palette).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(innerWidth, innerHeight)
  renderer.setClearColor(variant.palette.bg ?? '#050608')

  const scene = new THREE.Scene()
  if (variant.fog) scene.fog = new THREE.FogExp2(variant.fog, variant.fogDensity ?? 0.03)
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
  camera.position.set(0, 0.4, 7)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), variant.bloom?.strength ?? 0.9, variant.bloom?.radius ?? 0.6, variant.bloom?.threshold ?? 0.15)
  composer.addPass(bloom)
  const rgbShift = new ShaderPass(RGBShiftShader)
  rgbShift.uniforms.amount.value = 0
  composer.addPass(rgbShift)
  const glitch = new GlitchPass()
  glitch.enabled = false
  composer.addPass(glitch)

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight)
    composer.setSize(innerWidth, innerHeight)
  })

  const audio = new ToneAudio()
  const handle = variant.init(THREE, scene, camera)

  let phase = 'cabina'
  let phaseStartedAt = performance.now()
  let syncPercent = 0
  const phaseEls = Object.fromEntries(PHASES.map((p) => [p, document.querySelector(`.phase[data-phase="${p}"]`)]))
  const devButtons = [...document.querySelectorAll('#devbar button')]
  const flashEl = document.getElementById('flash')
  const assemblyEl = document.getElementById('assembly')

  function setPhase(next) {
    if (!PHASES.includes(next)) return
    const prev = phase
    phase = next
    phaseStartedAt = performance.now()
    PHASES.forEach((p) => phaseEls[p]?.classList.toggle('active', p === next))
    devButtons.forEach((b) => b.classList.toggle('on', b.dataset.phase === next))
    rgbShift.uniforms.amount.value = 0
    glitch.enabled = false
    assemblyEl.classList.remove('show', 'layer1', 'layer2', 'layer3')
    audio.hum(next === 'cabina')
    if (next === 'transmision') { runTerminal(); audio.sweep(); glitch.enabled = variant.transmisionGlitchPass ?? false }
    if (next === 'escaneo') { audio.beep(660); glitch.enabled = variant.escaneoGlitch ?? false }
    if (next === 'presencia') { syncPercent = 0; setSyncUi(0) }
    if (next === 'virtualizacion') runVirtualizacion(prev)
    variant.onPhase?.(next, handle)
  }

  function runTerminal() {
    const el = document.getElementById('terminal')
    const name = document.getElementById('displayName')?.value?.trim() || 'Usuario'
    const lines = [`> TRANSMISIÓN · ${name}`, '> enlazando…', '> estabilizando flujo de datos', '> OK']
    el.textContent = ''
    let i = 0, j = 0
    const step = () => {
      if (phase !== 'transmision') return
      if (i >= lines.length) { el.innerHTML += '<span class="cursor">&nbsp;</span>'; return }
      const line = lines[i]
      el.textContent += line[j] ?? ''
      j++
      if (variant.transmisionGlitch) rgbShift.uniforms.amount.value = 0.002 + Math.random() * 0.004
      if (j >= line.length) { el.textContent += '\n'; i++; j = 0; setTimeout(step, 220) }
      else setTimeout(step, 18 + Math.random() * 30)
    }
    step()
  }

  function setSyncUi(pct) {
    document.getElementById('syncBar').style.transform = `scaleX(${pct / 100})`
    document.getElementById('syncLabel').textContent = `Sincronización ${pct}%`
    document.getElementById('enterHint').style.display = pct >= 100 ? 'block' : 'none'
  }

  function runVirtualizacion(prev) {
    audio.whoosh()
    setTimeout(() => audio.chord(), 300)
    flashEl.style.transition = 'none'
    flashEl.style.opacity = '0'
    requestAnimationFrame(() => {
      flashEl.style.transition = 'opacity 0.12s ease-out'
      flashEl.style.opacity = '0.85'
      setTimeout(() => { flashEl.style.transition = 'opacity 0.9s ease-in'; flashEl.style.opacity = '0' }, 140)
    })
    variant.onVirtualize?.(handle)
    assemblyEl.classList.add('show')
    setTimeout(() => assemblyEl.classList.add('layer1'), 350)
    setTimeout(() => assemblyEl.classList.add('layer2'), 650)
    setTimeout(() => assemblyEl.classList.add('layer3'), 950)
  }

  devButtons.forEach((b) => b.addEventListener('click', () => setPhase(b.dataset.phase)))
  document.getElementById('mute').querySelector('button').addEventListener('click', (e) => {
    const btn = e.currentTarget
    const willMute = btn.dataset.muted !== 'true'
    btn.dataset.muted = String(willMute)
    btn.textContent = willMute ? 'Sonido: off' : 'Sonido: on'
    audio.setMuted(willMute)
  })
  document.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => setPhase('transmision')))
  document.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => setPhase('cabina')))
  document.querySelectorAll('[data-enter]').forEach((b) => b.addEventListener('click', () => { if (syncPercent >= 100) setPhase('virtualizacion') }))
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setPhase('cabina')
    if (e.key === 'Enter' && phase === 'cabina') setPhase('transmision')
    if (e.key === 'Enter' && phase === 'presencia' && syncPercent >= 100) setPhase('virtualizacion')
    const n = Number(e.key)
    if (n >= 1 && n <= 5) setPhase(PHASES[n - 1])
  })

  let last = performance.now()
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const elapsed = (now - phaseStartedAt) / 1000

    if (phase === 'presencia') {
      const t = elapsed % BREATH_TOTAL
      let acc = 0, word = BREATH_PATTERN[0].label, within = 0, dur = BREATH_PATTERN[0].sec
      for (const step of BREATH_PATTERN) {
        if (t < acc + step.sec) { word = step.label; within = t - acc; dur = step.sec; break }
        acc += step.sec
      }
      document.getElementById('breathWord').textContent = word
      handle.breathPhase = within / dur
      handle.breathWord = word
      syncPercent = Math.min(100, Math.round((elapsed / SYNC_DURATION) * 100))
      setSyncUi(syncPercent)
    }

    variant.update?.(handle, { phase, dt, elapsed, t: now / 1000 })
    composer.render()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  setPhase('cabina')
}
