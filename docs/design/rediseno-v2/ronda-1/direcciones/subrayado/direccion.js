// Subrayado (intermedia): apuntes marcados con fluorescente. Marcar ya es hacer.
// El fluorescente tiene solo cuatro trabajos: amarillo = ahora/selección, verde = hecho/progreso,
// rosa = urgente, y el trazo de la microcelebración. Nunca va solo: siempre con texto o forma.
;(function () {
  const D = window.NX_DATOS
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }
  const ic = (n, s = 16) => `<i data-lucide="${n}" class="ic ic-${s}" aria-hidden="true"></i>`
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const toMin = (h) => {
    const [a, b] = h.split(':').map(Number)
    return a * 60 + b
  }
  const span = toMin(D.jornada.fin) - toMin(D.jornada.inicio)
  const pos = (h) => ((toMin(h) - toMin(D.jornada.inicio)) / span) * 100

  window.NX_DIR = {
    meta: {
      nombre: 'Subrayado',
      frase: 'Tus apuntes del día, marcados con fluorescente: lo que toca ahora salta a la vista y lo hecho queda marcado.',
      tipos: 'Recursive (una sola familia: lineal en la interfaz, eje casual en títulos)',
      nivel: 'Dirección intermedia',
      celebracion: 'Un trazo de fluorescente verde cruza la tarea y queda tachada (480 ms). Con movimiento reducido, solo cambia la opacidad.',
    },
    swatches: [
      ['Papel', '--bg'],
      ['Hoja', '--surface'],
      ['Grafito', '--text'],
      ['Grafito suave', '--muted'],
      ['Amarillo', '--hl-yellow'],
      ['Verde', '--hl-green'],
      ['Rosa', '--hl-pink'],
      ['Atraso', '--warning'],
    ],
    brandMark: '<span class="sub-mark" aria-hidden="true"></span>',

    // Prioridad por texto (P1-P4 o nombre). Urgente lleva además el fluorescente rosa.
    prio(p, { label = true } = {}) {
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}"><span class="ptag${p === 1 ? ' hl hl-pink' : ''}">${
        label ? `${p === 1 ? ic('flag', 12) : ''}${PRIO[p]}` : `<span aria-hidden="true">P${p}</span><span class="sr">Prioridad ${PRIO[p]}</span>`
      }</span></span>`
    },

    dayCard() {
      const j = D.jornada
      const segs = D.bloques
        .map((b) => {
          const w = ((toMin(b.fin) - toMin(b.inicio)) / span) * 100
          const name = { hecha: 'hecha', ahora: 'ahora', siguiente: 'siguiente', pendiente: 'pendiente' }[b.estado]
          return `<li class="seg-b seg-${b.estado}" style="--x:${pos(b.inicio)}%;--w:${w}%" title="${b.inicio} ${esc(b.titulo)}" aria-label="${b.inicio} a ${b.fin}, ${esc(b.titulo)}: ${name}"></li>`
        })
        .join('')
      return `<section class="card daycard" aria-labelledby="t-dia">
        <div class="card-head"><h2 id="t-dia" class="h-section">Tiempo de hoy</h2><span class="meta">quedan <span class="num">${j.restante}</span>, <span class="num">${j.sinPlanificar}</span> libres</span></div>
        <div class="strip"><ol class="strip-blocks">${segs}</ol><span class="strip-now" style="--x:${pos(D.ahoraReloj)}%"><span class="num">${D.ahoraReloj}</span></span></div>
        <div class="strip-ends meta num"><span>${j.inicio}</span><span>12:00</span><span>16:00</span><span>${j.fin}</span></div>
        <ul class="legend meta"><li><span class="lg lg-done"></span>Hecho</li><li><span class="lg lg-now"></span>Ahora</li><li><span class="lg lg-next"></span>Siguiente</li><li><span class="lg lg-todo"></span>Por hacer</li></ul>
      </section>`
    },

    nowBlock() {
      const a = D.ahora
      const p = D.proyectos.find((x) => x.id === a.proyecto)
      const pct = (a.transcurridoMin / a.totalMin) * 100
      return `<section class="now" aria-labelledby="t-ahora">
        <div class="now-head"><h2 id="t-ahora" class="now-kicker">${ic('pen-line', 14)}Ahora</h2><span class="now-left num">${a.quedan}</span></div>
        <button class="now-title" type="button"><span class="hl hl-yellow">${esc(a.titulo)}</span></button>
        <div class="measure" role="meter" aria-valuemin="0" aria-valuemax="${a.totalMin}" aria-valuenow="${a.transcurridoMin}" aria-valuetext="${a.transcurridoMin} de ${a.totalMin} minutos, de ${a.inicio} a ${a.fin}">
          <div class="measure-line"><span class="measure-done" style="width:${pct}%"></span></div>
          <div class="measure-ends meta num"><span>${a.inicio}</span><span class="measure-dur-txt">${a.transcurridoMin} de ${a.totalMin} min</span><span>${a.fin}</span></div>
        </div>
        <dl class="props">
          <div><dt>Proyecto</dt><dd><span class="dot" style="background:${p.color}"></span>${p.nombre}</dd></div>
          <div><dt>Prioridad</dt><dd>${window.NX_DIR.prio(a.prioridad)}</dd></div>
          <div><dt>Energía</dt><dd>${a.energia}</dd></div>
          <div><dt>Objetivo</dt><dd>${esc(a.objetivo)}</dd></div>
        </dl>
        <div class="now-actions">
          <button class="btn btn-primary" type="button">${ic('timer', 14)}Empezar foco</button>
          <button class="btn btn-secondary" type="button" data-celebrate="now">${ic('check', 14)}Hecha</button>
          <button class="btn btn-ghost" type="button">Pasar a mañana</button>
        </div>
        <p class="now-next meta">Después: <strong>${esc(a.siguiente.titulo)}</strong>, <span class="num">${a.siguiente.cuando}</span></p>
      </section>`
    },

    celebrate(el, { reduced, now }) {
      const target = now ? el.querySelector('.now-title') : el.querySelector('.row-title')
      if (!target) return
      if (reduced) {
        target.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 200 })
        return
      }
      const host = target.parentElement
      host.style.position = 'relative'
      const s = document.createElement('span')
      s.className = 'cel-stroke'
      const r = target.getBoundingClientRect()
      const h = host.getBoundingClientRect()
      Object.assign(s.style, { left: `${r.left - h.left - 4}px`, top: `${r.top - h.top + r.height * 0.18}px`, width: `${r.width + 8}px`, height: `${r.height * 0.7}px` })
      host.appendChild(s)
      s.animate(
        [
          { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
          { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.7 },
          { clipPath: 'inset(0 0 0 0)', opacity: 0 },
        ],
        { duration: 480, easing: 'cubic-bezier(.3,.7,.1,1)' },
      ).finished.then(() => s.remove())
    },
  }
})()
