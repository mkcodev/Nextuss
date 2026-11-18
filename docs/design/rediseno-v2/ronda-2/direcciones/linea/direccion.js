// Línea: identidad y piezas firma. Movimiento firme y preciso: muelles rígidos, casi sin rebote,
// un resaltado magnético en la barra lateral, iconos de estado que se transforman y un destello
// en el borde al completar. El foco no tapa la app: abre una ficha lateral.
;(function () {
  const D = window.NX_DATOS
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }
  const ic = (n, s = 14) => `<i data-lucide="${n}" class="ic ic-${s}" aria-hidden="true"></i>`
  const kbd = (k) => k.split(' ').map((p) => `<kbd>${p}</kbd>`).join('')
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

  const status = (s) => {
    const name = { pendiente: 'Pendiente', 'en-curso': 'En curso', hecha: 'Hecha' }[s]
    const inner =
      s === 'hecha'
        ? '<circle class="fill st-fill" cx="8" cy="8" r="7"/><path class="check st-check" pathLength="1" d="M5 8.3l2 2 4-4.4"/>'
        : `<circle class="ring" cx="8" cy="8" r="6.5"/>${s === 'en-curso' ? '<circle class="pie" cx="8" cy="8" r="3.25" pathLength="1" stroke-dasharray="0.5 1"/>' : ''}`
    return `<svg class="status lin-st${s === 'en-curso' ? ' is-curso' : ''}" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="${name}">${inner}</svg>`
  }

  window.NX_DIR = {
    meta: {
      nombre: 'Línea',
      nivel: 'Profesional, al estilo de las herramientas de ingeniería',
      frase: 'Precisión tranquila: todo a mano desde el teclado y nada que sobre.',
      tipos: 'Instrument Sans (texto y títulos, wdth 96) + Geist Mono (atajos, horas, cifras)',
      paleta: {
        claro: { fondo: '#fbfbfc', lateral: '#f4f5f7', superficie: '#ffffff', borde: '#e4e6ea', texto: '#17181b', secundario: '#5b5f69', acento: '#0d8f83' },
        oscuro: { fondo: '#0d0e10', lateral: '#0a0b0d', superficie: '#131418', borde: '#22252b', texto: '#eceef1', secundario: '#9a9ea8', acento: '#35c9b9' },
      },
      radios: 'controles 6-7 px, cajas 8 px, diálogos 12 px',
      sombras: 'bordes de 1 px por sombra interior; solo las capas flotan',
    },
    defaultTheme: 'dark',
    strokeWidth: 1.6,
    brandMark: '<span class="lin-mark" aria-hidden="true"></span>',
    motion: {
      ui: { type: 'spring', stiffness: 640, damping: 46 },
      pop: { type: 'spring', stiffness: 900, damping: 34 },
      soft: { type: 'spring', stiffness: 380, damping: 40 },
      ease: [0.2, 0.8, 0.2, 1],
    },
    themeDuration: 560,

    status,
    prio(p, { label = true } = {}) {
      const lab = label ? `<span class="prio-label">${PRIO[p]}</span>` : `<span class="sr">Prioridad ${PRIO[p]}</span>`
      if (p === 1) return `<span class="prio prio-1" title="Prioridad Urgente"><span class="lin-urgent" aria-hidden="true">!</span>${lab}</span>`
      const on = { 2: 3, 3: 2, 4: 1 }[p]
      const bars = [5, 8, 11].map((h, i) => `<span class="bar${i < on ? ' on' : ''}" style="height:${h}px"></span>`).join('')
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}"><span class="prio-bars" aria-hidden="true">${bars}</span>${lab}</span>`
    },

    // La tarta de «en curso» se llena hasta el círculo completo y entonces aparece la marca.
    async statusMorph(btn, from, to, fx) {
      const svg = btn.firstElementChild
      if (to === 'hecha') {
        let pie = svg.querySelector('.pie')
        if (!pie) {
          svg.insertAdjacentHTML('beforeend', '<circle class="pie" cx="8" cy="8" r="3.25" pathLength="1" stroke-dasharray="0 1"/>')
          pie = svg.querySelector('.pie')
        }
        pie.style.stroke = 'var(--accent)'
        svg.querySelector('.ring').style.stroke = 'var(--accent)'
        await fx.A(pie, { strokeDasharray: [pie.getAttribute('stroke-dasharray'), '1 1'] }, { duration: 0.2, ease: [0.4, 0, 0.2, 1] })
        btn.innerHTML = status('hecha')
        const n = btn.firstElementChild
        fx.A(n.querySelector('.fill'), { scale: [0.55, 1] }, fx.SP.pop)
        fx.A(n.querySelector('.check'), { strokeDashoffset: [1, 0] }, { duration: 0.26, delay: 0.05, ease: [0.3, 0, 0.2, 1] })
      } else {
        btn.innerHTML = status(to)
        fx.A(btn.firstElementChild, { scale: [0.7, 1], rotate: [-90, 0] }, fx.SP.pop)
      }
    },

    // Destello: una línea de luz recorre el borde inferior de la fila.
    celebrate(row, fx) {
      if (fx.lv() === 'off' || fx.lv() === 'none') return
      const s = document.createElement('span')
      s.className = 'lin-sweep'
      const f = document.createElement('span')
      f.className = 'lin-flash'
      row.append(f, s)
      fx.A(f, { opacity: [0, 1, 0] }, { duration: 0.7, ease: 'easeOut' }).then(() => f.remove())
      fx.A(s, { x: ['-100%', '230%'], opacity: [0, 1, 1, 0] }, { duration: 0.75, ease: [0.3, 0, 0.2, 1] }).then(() => s.remove())
    },

    inserted(row, fx) {
      fx.A(row, { opacity: [0, 1], y: [-8, 0] }, fx.SP.pop)
      const s = document.createElement('span')
      s.className = 'lin-sweep'
      row.append(s)
      fx.A(s, { x: ['-100%', '230%'] }, { duration: 0.8, delay: 0.1, ease: [0.3, 0, 0.2, 1] }).then(() => s.remove())
      setTimeout(() => fx.A(row, { backgroundColor: 'rgba(0,0,0,0)' }, { duration: 1.2 }).then(() => row.classList.remove('is-new')), 900)
    },

    paletteOpened(pal) {
      pal.classList.remove('is-sweep')
      void pal.offsetWidth
      pal.classList.add('is-sweep')
    },

    // Foco: ficha lateral con el temporizador, propiedades y subtareas.
    focusMode() {
      const a = D.ahora
      const p = D.proyectos.find((x) => x.id === a.proyecto)
      return `<div class="lin-focus-bg" data-close="focus"></div>
      <div class="focus-in">
        <div class="lin-fhead"><span class="lin-id">NX-142</span><span class="meta">${p.nombre}</span><span class="grow"></span>
          <button class="icon-btn sm" type="button" data-close="focus" aria-label="Cerrar la ficha">${ic('x')}</button></div>
        <h2 class="focus-title" id="focus-t">${esc(a.titulo)}</h2>
        <div class="lin-props">
          <span class="chip">${status('en-curso')}En curso</span>
          <span class="chip">${window.NX_DIR.prio(a.prioridad)}</span>
          <span class="chip"><span class="dot" style="background:${p.color}"></span>${p.nombre}</span>
          <span class="chip">${ic('target')}${esc(a.objetivo)}</span>
        </div>
        <div class="lin-timer-wrap">
          <div class="focus-timer num" id="focus-timer">33:00</div>
          <div class="focus-bar" aria-hidden="true"><span class="focus-fill" id="focus-fill"></span></div>
          <p class="meta">De <span class="num">${a.inicio}</span> a <span class="num">${a.fin}</span>. Después: ${esc(a.siguiente.titulo)}.</p>
        </div>
        <div><h3 class="h-sub">Subtareas</h3>
        <ul class="focus-subs">${D.foco.subtareas
          .map((s, i) => `<li><button type="button" class="sub${s.hecha ? ' is-done' : ''}" data-sub="${i}" aria-pressed="${s.hecha}">${status(s.hecha ? 'hecha' : 'pendiente')}<span>${esc(s.titulo)}</span></button></li>`)
          .join('')}</ul></div>
        <div class="focus-actions">
          <button class="btn btn-primary" type="button" id="focus-pause">${ic('pause')}<span>Pausar</span></button>
          <button class="btn btn-ghost" type="button" data-close="focus">Salir ${kbd('Esc')}</button>
        </div>
      </div>`
    },
    async focusEnter(now, layer, fx) {
      const panel = layer.querySelector('.focus-in')
      const bg = layer.querySelector('.lin-focus-bg')
      const app = document.querySelector('.app')
      fx.A(bg, { opacity: [0, 1] }, { duration: 0.25 })
      fx.A(app, { scale: [1, 0.985], filter: ['brightness(1)', 'brightness(0.82)'] }, fx.SP.soft)
      fx.A([...panel.children], { opacity: [0, 1], y: [10, 0] }, { ...fx.SP.ui, delay: fx.M.stagger(0.04, { startDelay: 0.08 }) })
      await fx.A(panel, { x: ['100%', '0%'] }, fx.SP.ui)
    },
    async focusExit(now, layer, fx) {
      const panel = layer.querySelector('.focus-in')
      const bg = layer.querySelector('.lin-focus-bg')
      const app = document.querySelector('.app')
      fx.A(bg, { opacity: 0 }, { duration: 0.2 })
      fx.A(app, { scale: 1, filter: 'brightness(1)' }, fx.SP.ui)
      await fx.A(panel, { x: '100%' }, { ...fx.SP.ui, stiffness: 520, damping: 50 })
      app.style.transform = ''
      app.style.filter = ''
    },

    enter(fx) {
      const blocks = fx.$$('.page-head, .col-main > *, .col-side > *')
      fx.A(blocks, { opacity: [0, 1], y: [8, 0] }, { ...fx.SP.soft, delay: fx.M.stagger(0.035) })
      fx.A(fx.$$('.side-item'), { opacity: [0, 1], x: [-6, 0] }, { ...fx.SP.ui, delay: fx.M.stagger(0.018) })
    },
  }

  // Resaltado magnético en la barra lateral: una sola pieza que sigue al puntero de un elemento a otro.
  document.addEventListener('DOMContentLoaded', () => {
    const fx = window.NX_FX
    document.querySelectorAll('.side-list').forEach((list) => {
      const hl = document.createElement('span')
      hl.className = 'lin-hl'
      hl.setAttribute('aria-hidden', 'true')
      list.prepend(hl)
      let shown = false
      list.addEventListener('pointerover', (e) => {
        const it = e.target.closest('.side-item')
        if (!it) return
        const y = it.parentElement.offsetTop
        if (!shown || fx.lv() !== 'full') fx.A(hl, { y }, { duration: 0 })
        else fx.A(hl, { y }, { type: 'spring', stiffness: 700, damping: 42 })
        fx.A(hl, { opacity: 1 }, { duration: 0.12 })
        shown = true
      })
      list.addEventListener('pointerleave', () => {
        shown = false
        fx.A(hl, { opacity: 0 }, { duration: 0.18 })
      })
    })
  })
})()
