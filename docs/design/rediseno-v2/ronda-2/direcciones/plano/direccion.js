// Plano: identidad y piezas firma. Movimiento mecánico, sin rebote:
// - la rejilla se traza al cargar y aparecen las cruces de las esquinas;
// - al pasar el ratón, una cruz salta a la esquina del bloque que miras;
// - las cifras ruedan como un contador mecánico (XP, hechas, temporizador);
// - al completar, un barrido invierte la fila;
// - el foco pasa la pantalla a negro con el temporizador en mono gigante.
;(function () {
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }
  const MECH = [0.7, 0, 0.3, 1]

  const status = (s) => {
    const name = { pendiente: 'Pendiente', 'en-curso': 'En curso', hecha: 'Hecha' }[s]
    const inner =
      s === 'hecha'
        ? '<rect class="st-fill" x="1" y="1" width="14" height="14" rx="2.5"/><path class="st-check" pathLength="1" d="M4.6 8.2l2.3 2.3 4.6-4.8"/>'
        : `<rect class="box" x="1.75" y="1.75" width="12.5" height="12.5" rx="2"/>${s === 'en-curso' ? '<path class="half" d="M4 12.2 12.2 4v8.2z"/>' : ''}`
    return `<svg class="status pl-st${s === 'en-curso' ? ' is-curso' : ''}" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="${name}">${inner}</svg>`
  }

  // Odómetro: cada cifra es una columna 0-9 que se desplaza. El texto real queda para lectores de pantalla.
  function odometer(el, text, fx, { instant = false, stagger = 0.035, duration = 0.55 } = {}) {
    const fits = el._od && el._od.length === text.length && el._od.every((c, i) => c.digit === /\d/.test(text[i]))
    let fresh = false
    if (!fits) {
      el.innerHTML = `<span class="sr">${text}</span><span aria-hidden="true">${[...text]
        .map((ch) => (/\d/.test(ch) ? `<span class="od"><span class="od-col">${[...'0123456789'].map((d) => `<span>${d}</span>`).join('')}</span></span>` : `<span class="od-s">${ch}</span>`))
        .join('')}</span>`
      el._od = [...el.lastElementChild.children].map((c) => ({ el: c, digit: c.classList.contains('od'), col: c.querySelector('.od-col') }))
      fresh = true
    } else el.firstElementChild.textContent = text
    const n = el._od.length
    el._od.forEach((c, i) => {
      if (!c.digit) return (c.el.textContent = text[i])
      const y = `${-(+text[i]) * 10}%`
      if (instant) fx.M.animate(c.col, { y }, { duration: 0 })
      else fx.A(c.col, { y }, { duration, ease: MECH, delay: (n - 1 - i) * stagger + (fresh ? 0.02 : 0) })
    })
  }

  window.NX_DIR = {
    meta: {
      nombre: 'Plano',
      nivel: 'Profesional, monocromo, al estilo de las plataformas para desarrolladores',
      frase: 'Blanco, negro y una rejilla: lo importante se ve porque no hay nada más.',
      tipos: 'Geist (texto y títulos) + Geist Mono (cifras, horas, códigos de prioridad)',
      paleta: {
        claro: { fondo: '#ffffff', sutil: '#fafafa', hover: '#f2f2f2', borde: '#ebebeb', texto: '#000000', secundario: '#5e5e5e', invertido: '#000000' },
        oscuro: { fondo: '#000000', sutil: '#0a0a0a', hover: '#1a1a1a', borde: '#262626', texto: '#ffffff', secundario: '#a1a1a1', invertido: '#ffffff' },
      },
      radios: 'bloques 0 (la rejilla manda), controles 4-6 px, diálogos 12 px',
      sombras: 'ninguna en la página; solo las capas flotantes',
    },
    strokeWidth: 1.5,
    brandMark: '<span class="pl-mark" aria-hidden="true"></span>',
    motion: {
      ui: { type: 'spring', stiffness: 520, damping: 2 * Math.sqrt(520) }, // amortiguado crítico: llega sin pasarse
      pop: { duration: 0.22, ease: [0.2, 0, 0, 1] },
      soft: { duration: 0.5, ease: MECH },
      ease: MECH,
      out: [0.7, 0, 1, 1],
    },
    themeDuration: 560,
    themeEasing: 'cubic-bezier(.7,0,.3,1)',
    themeKeyframes: () => ({ clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'] }),

    status,
    prio(p, { label = true } = {}) {
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}"><span class="pl-prio" aria-hidden="true">P${p}</span>${
        label ? `<span class="prio-label">${PRIO[p]}</span>` : `<span class="sr">Prioridad ${PRIO[p]}</span>`
      }</span>`
    },

    statusMorph(btn, from, to, fx) {
      btn.innerHTML = status(to)
      const svg = btn.firstElementChild
      if (to === 'hecha') {
        fx.A(svg.querySelector('.st-fill'), { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] }, { duration: 0.22, ease: MECH })
        fx.A(svg.querySelector('.st-check'), { strokeDashoffset: [1, 0] }, { duration: 0.22, delay: 0.18, ease: MECH })
      } else fx.A(svg, { opacity: [0, 1] }, { duration: 0.15 })
    },

    // Barrido: una banda en modo diferencia cruza la fila y la invierte al pasar.
    celebrate(row, fx) {
      if (fx.lv() === 'off' || fx.lv() === 'none') return
      const w = document.createElement('span')
      w.className = 'pl-wipe'
      row.append(w)
      fx.A(w, { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)', 'inset(0 0% 0 0)', 'inset(0 0 0 100%)'] }, { duration: fx.lv() === 'soft' ? 0.5 : 0.75, times: [0, 0.4, 0.55, 1], ease: MECH }).then(() => w.remove())
    },
    inserted(row, fx) {
      this.celebrate(row, fx)
      setTimeout(() => row.classList.remove('is-new'), 1400)
    },

    ticker(el, from, to, fx) {
      if (el._plus === undefined) el._plus = el.textContent.trim().startsWith('+')
      const text = el.dataset.fmt === 'miles' ? to.toLocaleString('es') : `${el._plus ? '+' : ''}${to}`
      if (!el._od) odometer(el, el.dataset.fmt === 'miles' ? from.toLocaleString('es') : `${el._plus ? '+' : ''}${from}`, fx, { instant: true })
      odometer(el, text, fx)
    },
    timerRender(el, text, fx) {
      odometer(el, text, fx, { instant: el._hold, stagger: 0.02, duration: 0.28 })
    },

    // Foco: el bloque Ahora se abre hasta ocupar la pantalla, en negro; las cifras ruedan desde 00:00.
    async focusEnter(now, layer, fx) {
      const r = now.getBoundingClientRect()
      const timer = layer.querySelector('#focus-timer')
      const real = timer.textContent.match(/\d\d:\d\d/)?.[0] || '33:00'
      timer._hold = true
      odometer(timer, '00:00', fx, { instant: true })
      timer._hold = false
      const items = [...layer.querySelectorAll('.focus-meta, .focus-title, .focus-bar, .focus-subs li, .focus-actions')]
      fx.A(items, { opacity: [0, 1], y: [12, 0] }, { duration: 0.4, ease: [0.2, 0, 0, 1], delay: fx.M.stagger(0.04, { startDelay: 0.32 }) })
      await fx.A(layer, { clipPath: [`inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`, 'inset(0px 0px 0px 0px)'] }, { duration: fx.lv() === 'soft' ? 0.4 : 0.6, ease: MECH })
      odometer(timer, real, fx, { stagger: 0.06, duration: 0.8 })
    },
    async focusExit(now, layer, fx) {
      const r = now.getBoundingClientRect()
      fx.A(layer.querySelector('.focus-in'), { opacity: 0 }, { duration: 0.15 })
      await fx.A(layer, { clipPath: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)` }, { duration: 0.5, ease: MECH })
      layer.querySelector('.focus-in').style.opacity = ''
    },

    // Entrada: las líneas de la rejilla se trazan una tras otra y después aparecen las cruces.
    enter(fx) {
      const draw = [document.querySelector('.col-side'), ...document.querySelectorAll('.col-main > * + *, .col-side > * + *')].filter(Boolean)
      draw.forEach((el, i) => {
        el.style.setProperty('--draw', 0)
        fx.M.animate(0, 1, { duration: fx.lv() === 'soft' ? 0.4 : 0.7, delay: 0.1 + i * 0.05, ease: MECH, onUpdate: (v) => el.style.setProperty('--draw', v) })
      })
      fx.A(fx.$$('.page-head, .col-main > * > *, .col-side > * > *'), { opacity: [0, 1] }, { duration: 0.5, ease: [0.2, 0, 0, 1], delay: fx.M.stagger(0.012, { startDelay: 0.15 }) })
      fx.A(fx.$$('.pl-x:not(.pl-hx)'), { scale: [0, 1], rotate: [90, 0] }, { duration: 0.45, ease: MECH, delay: fx.M.stagger(0.05, { startDelay: 0.55 }) })
    },
  }

  // Cruces de la rejilla (esquinas y unión con la columna lateral) y cruz que sigue al bloque señalado.
  function crosses() {
    const cols = document.querySelector('.cols')
    const side = document.querySelector('.col-side')
    cols.querySelectorAll('.pl-x').forEach((x) => x.remove())
    const wide = innerWidth >= 1024
    const pts = [['0', '0'], ['100%', '0'], ['0', '100%'], ['100%', '100%']]
    if (wide) pts.push([`${side.offsetLeft}px`, '0'], [`${side.offsetLeft}px`, '100%'])
    pts.forEach(([l, t]) => cols.insertAdjacentHTML('beforeend', `<span class="pl-x" style="left:${l};top:${t}" aria-hidden="true"></span>`))
    cols.insertAdjacentHTML('beforeend', '<span class="pl-x pl-hx" aria-hidden="true"></span>')
  }
  document.addEventListener('DOMContentLoaded', () => {
    crosses()
    addEventListener('resize', crosses)
    const fx = window.NX_FX
    const cols = document.querySelector('.cols')
    let shown = false
    cols.addEventListener('pointerover', (e) => {
      const b = e.target.closest('.col-main > *, .col-side > *')
      const hx = cols.querySelector('.pl-hx')
      if (!b || !hx) return
      const c = cols.getBoundingClientRect()
      const r = b.getBoundingClientRect()
      const pos = { left: `${r.left - c.left}px`, top: `${r.top - c.top}px` }
      if (!shown) {
        Object.assign(hx.style, pos)
        fx.A(hx, { opacity: [0, 1], scale: [0.4, 1], rotate: [90, 0] }, { duration: 0.3, ease: MECH })
      } else fx.A(hx, pos, { duration: 0.32, ease: MECH })
      shown = true
    })
    cols.addEventListener('pointerleave', () => {
      shown = false
      fx.A(cols.querySelector('.pl-hx'), { opacity: 0 }, { duration: 0.2 })
    })
  })
})()
