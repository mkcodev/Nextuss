// Retos R0 · port fiel de src/design/primitives/Celebration.tsx con motion@14.14.0 vanilla.
// Valores de PRESET.celebrateFlash y PRESET.celebrateSweep (src/design/motion.ts):
//   destello: opacidad 0 → 1 → 0, 700 ms, easeOut, en accent-soft sobre todo el contenedor;
//   barrido: línea de 1 px y 45 % de ancho en el borde inferior, x −100 % → 230 %, opacidad 0 → 1 → 1 → 0,
//            750 ms, cubic-bezier(.3, 0, .2, 1).
// Con movimiento reducido: solo el destello, en 140 ms lineales, sin barrido.
// Es la única microcelebración: solo visual, sin sonido, y solo en la transición «no hecho → hecho»
// causada por el usuario.
;(function () {
  window.RT_celebrate = function (host, { reduce = false } = {}) {
    if (!host || !window.Motion) return Promise.resolve()
    host.querySelectorAll(':scope > .celebration').forEach((n) => n.remove())
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
    const wrap = document.createElement('span')
    wrap.className = 'celebration'
    wrap.setAttribute('aria-hidden', 'true')
    wrap.dataset.celebration = ''
    const flash = document.createElement('span')
    flash.className = 'cel-flash'
    wrap.append(flash)
    host.append(wrap)
    const { animate } = window.Motion
    const done = () => wrap.remove()
    if (reduce) return animate(flash, { opacity: [0, 1, 0] }, { duration: 0.14, ease: 'linear' }).then(done)
    const sweep = document.createElement('span')
    sweep.className = 'cel-sweep'
    sweep.dataset.celebrationSweep = ''
    wrap.append(sweep)
    animate(flash, { opacity: [0, 1, 0] }, { duration: 0.7, ease: 'easeOut' })
    return animate(sweep, { x: ['-100%', '230%'], opacity: [0, 1, 1, 0] }, { duration: 0.75, ease: [0.3, 0, 0.2, 1] }).then(done)
  }
})()
