// Andén (contenida): señalética de estación. Sabes dónde estás y qué sale después.
;(function () {
  const D = window.NX_DATOS
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }
  const ic = (n, s = 16) => `<i data-lucide="${n}" class="ic ic-${s}" aria-hidden="true"></i>`
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const toMin = (h) => {
    const [a, b] = h.split(':').map(Number)
    return a * 60 + b
  }
  const pos = (h) => ((toMin(h) - toMin(D.jornada.inicio)) / (toMin(D.jornada.fin) - toMin(D.jornada.inicio))) * 100

  window.NX_DIR = {
    meta: {
      nombre: 'Andén',
      frase: 'Como el panel de una estación: de un vistazo sabes dónde estás, qué sale ahora y qué viene después.',
      tipos: 'Archivo (estrecha, títulos y horas) + Atkinson Hyperlegible Next (texto)',
      nivel: 'Dirección contenida',
      celebracion: 'La estación se llena y una vía recorre la fila hasta el final (420 ms). Con movimiento reducido, solo aparece la marca.',
    },
    swatches: [
      ['Fondo', '--bg'],
      ['Superficie', '--surface'],
      ['Tinta', '--text'],
      ['Tinta atenuada', '--muted'],
      ['Verde vía', '--accent'],
      ['Amarillo señal', '--signal'],
      ['Atraso', '--warning'],
      ['Peligro', '--danger'],
    ],
    brandMark: '<span class="anden-mark" aria-hidden="true"></span>',

    // Prioridad: barras por forma + código visible (P1-P4) o nombre completo.
    prio(p, { label = true } = {}) {
      const on = { 1: 3, 2: 3, 3: 2, 4: 1 }[p]
      const bars = [5, 8, 11].map((h, i) => `<span class="bar${i < on ? ' on' : ''}" style="height:${h}px"></span>`).join('')
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}"><span class="prio-bars" aria-hidden="true">${bars}</span>${
        label ? `<span class="prio-label">${PRIO[p]}</span>` : `<span class="prio-code" aria-hidden="true">P${p}</span><span class="sr">Prioridad ${PRIO[p]}</span>`
      }</span>`
    },

    // Firma: la línea del día. Cada bloque es una estación; debajo, el panel de salidas.
    dayCard() {
      const j = D.jornada
      const now = pos(D.ahoraReloj)
      const stations = D.bloques
        .map((b) => {
          const name = { hecha: 'hecha', ahora: 'ahora', siguiente: 'siguiente', pendiente: 'pendiente' }[b.estado]
          return `<li class="st st-${b.estado}" style="--x:${pos(b.inicio)}%" aria-label="${b.inicio}, ${esc(b.titulo)}: ${name}">${
            b.estado === 'hecha' ? ic('check', 12) : ''
          }</li>`
        })
        .join('')
      const ahora = D.bloques.find((b) => b.estado === 'ahora')
      const sig = D.bloques.find((b) => b.estado === 'siguiente')
      return `<section class="card daycard" aria-labelledby="t-dia">
        <div class="card-head"><h2 id="t-dia" class="h-section">Línea del día</h2><span class="meta">Quedan <span class="num">${j.restante}</span>, <span class="num">${j.sinPlanificar}</span> sin planificar</span></div>
        <div class="line">
          <span class="line-done" style="width:${now}%"></span>
          <span class="line-now" style="--x:${now}%"><span class="num">${D.ahoraReloj}</span></span>
          <ol class="stations">${stations}</ol>
        </div>
        <div class="line-ends meta num"><span>${j.inicio}</span><span>${j.fin}</span></div>
        <dl class="board">
          <div class="board-row is-now"><dt>Ahora</dt><dd class="num">${ahora.inicio}</dd><dd class="board-title">${esc(ahora.titulo)}</dd></div>
          <div class="board-row"><dt>Siguiente</dt><dd class="num">${sig.inicio}</dd><dd class="board-title">${esc(sig.titulo)} <span class="meta">en 33 min</span></dd></div>
        </dl>
      </section>`
    },

    nowBlock() {
      const a = D.ahora
      const p = D.proyectos.find((x) => x.id === a.proyecto)
      const pct = (a.transcurridoMin / a.totalMin) * 100
      return `<section class="now" aria-labelledby="t-ahora">
        <div class="now-band"><h2 id="t-ahora" class="now-kicker">${ic('circle-dot', 16)}Ahora</h2><span class="now-left num">${a.quedan}</span></div>
        <div class="now-in">
        <button class="now-title" type="button">${esc(a.titulo)}</button>
        <div class="measure" role="meter" aria-valuemin="0" aria-valuemax="${a.totalMin}" aria-valuenow="${a.transcurridoMin}" aria-valuetext="${a.transcurridoMin} de ${a.totalMin} minutos, de ${a.inicio} a ${a.fin}">
          <div class="measure-line"><span class="measure-done" style="width:${pct}%"></span><span class="measure-dur num">${a.duracion}</span></div>
          <div class="measure-ends meta num"><span>${a.inicio}</span><span>${a.fin}</span></div>
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
        </div></div>
      </section>`
    },

    celebrate(el, { reduced }) {
      const mark = el.querySelector('.status') || el.querySelector('.now-kicker .ic')
      if (reduced) {
        mark && mark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 })
        return
      }
      mark && mark.animate([{ scale: 0.6 }, { scale: 1.12 }, { scale: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' })
      const rail = document.createElement('span')
      rail.className = 'cel-rail'
      el.appendChild(rail)
      rail
        .animate(
          [
            { transform: 'scaleX(0)', opacity: 1 },
            { transform: 'scaleX(1)', opacity: 1, offset: 0.75 },
            { transform: 'scaleX(1)', opacity: 0 },
          ],
          { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
        .finished.then(() => rail.remove())
    },
  }
})()
