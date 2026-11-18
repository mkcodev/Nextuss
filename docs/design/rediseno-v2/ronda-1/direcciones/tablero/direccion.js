// Tablero (atrevida): juego de mesa. La XP es una casilla que avanzas; la prioridad son puntos de dado.
// El color saturado se queda en el shell, en «Ahora» y en las fichas; las listas siguen tranquilas.
;(function () {
  const D = window.NX_DATOS
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }
  const ic = (n, s = 16) => `<i data-lucide="${n}" class="ic ic-${s}" aria-hidden="true"></i>`
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  // Nivel 12 va de 2.000 a 2.800 XP: 10 casillas de 80 XP. 2.340 XP = casilla 5 (4 completas).
  const SPACES = 10
  const filled = Math.floor((D.usuario.xp - 2000) / 80)

  // Puntos de dado: Urgente 4, Alta 3, Media 2, Baja 1 (posiciones de una cara de dado).
  const PIPS = { 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 2: [[0, 0], [2, 2]], 1: [[1, 1]] }
  const die = (p) => {
    const n = { 1: 4, 2: 3, 3: 2, 4: 1 }[p]
    return `<span class="die die-${p}" aria-hidden="true">${PIPS[n].map(([x, y]) => `<i style="--px:${x};--py:${y}"></i>`).join('')}</span>`
  }

  const track = (opts = {}) => {
    const cells = Array.from({ length: SPACES }, (_, i) => {
      const cls = i < filled ? 'sp-done' : i === filled ? 'sp-here' : ''
      const ghost = opts.preview && i === filled + 1 ? ' sp-next' : ''
      return `<li class="sp ${cls}${ghost}">${i === filled ? '<span class="pawn"></span>' : ''}</li>`
    }).join('')
    return `<ol class="track" aria-label="Nivel ${D.usuario.nivel}: casilla ${filled + 1} de ${SPACES}">${cells}<li class="sp sp-goal">${ic('flag', 12)}</li></ol>`
  }

  window.NX_DIR = {
    meta: {
      nombre: 'Tablero',
      frase: 'Tu día como un tablero: cada cosa hecha mueve tu ficha una casilla, y siempre ves cuánto falta para la meta.',
      tipos: 'Bricolage Grotesque (títulos, con tamaño óptico) + Onest (texto)',
      nivel: 'Dirección atrevida',
      celebracion: 'La ficha de la tarea salta y sube un «+XP» que se desvanece (520 ms). Con movimiento reducido, solo cambia la opacidad.',
    },
    swatches: [
      ['Fondo', '--bg'],
      ['Tapete', '--rail'],
      ['Sol', '--accent'],
      ['Tomate', '--tomato'],
      ['Cielo', '--sky'],
      ['Tinta', '--text'],
      ['Tinta atenuada', '--muted'],
      ['Atraso', '--warning'],
    ],
    brandMark: '<span class="pawn brand-pawn" aria-hidden="true"></span>',

    prio(p, { label = true } = {}) {
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}">${die(p)}${label ? `<span class="prio-label">${PRIO[p]}</span>` : `<span class="sr">Prioridad ${PRIO[p]}</span>`}</span>`
    },

    habitDay(state, i) {
      const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
      const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      const hoy = i === D.hoyIndice
      return `<li class="wd wd-${state}${hoy ? ' wd-hoy' : ''}" aria-label="${nombres[i]}: ${state}${hoy ? ', hoy' : ''}">${
        state === 'hecho' ? ic('check', 12) : `<span aria-hidden="true">${dias[i]}</span>`
      }</li>`
    },

    xpPanel() {
      const u = D.usuario
      return `<div class="xp">
        <div class="xp-head"><span class="xp-level">Nivel ${u.nivel}</span><span class="meta num">${u.xp.toLocaleString('es')} / ${u.xpSiguiente.toLocaleString('es')} XP</span></div>
        ${track()}
        <p class="meta">Casilla <span class="num">${filled + 1}</span> de ${SPACES}. Cada casilla son 80 XP; hoy llevas <span class="num">+${u.xpHoy}</span>.</p></div>`
    },

    dayCard() {
      const j = D.jornada
      const hours = Array.from({ length: 12 }, (_, i) => 8 + i)
      const blockAt = (h) => D.bloques.find((b) => Number(b.inicio.slice(0, 2)) === h)
      const cells = hours
        .map((h) => {
          const b = blockAt(h)
          const past = h < 10
          const now = h === 10
          const st = b ? b.estado : ''
          return `<li class="hr${past ? ' hr-past' : ''}${now ? ' hr-now' : ''}${b ? ` hr-b hr-${st}` : ''}" ${b ? `aria-label="${b.inicio}, ${esc(b.titulo)}: ${st}"` : 'aria-hidden="true"'}><span class="hr-n num">${h}</span>${
            b ? (st === 'hecha' ? ic('check', 12) : st === 'ahora' ? '<span class="pawn sm"></span>' : '<span class="hr-dot"></span>') : ''
          }</li>`
        })
        .join('')
      return `<section class="card daycard" aria-labelledby="t-dia">
        <div class="card-head"><h2 id="t-dia" class="h-section">Tiempo de hoy</h2><span class="meta">Quedan <span class="num">${j.restante}</span>, <span class="num">${j.sinPlanificar}</span> sin planificar</span></div>
        <ol class="hours">${cells}</ol>
        <ul class="legend meta"><li><span class="lg lg-done">${ic('check', 12)}</span>Hecho</li><li><span class="pawn sm"></span>Estás aquí</li><li><span class="lg"><span class="hr-dot"></span></span>Bloque planificado</li></ul>
      </section>`
    },

    nowBlock() {
      const a = D.ahora
      const p = D.proyectos.find((x) => x.id === a.proyecto)
      const pct = (a.transcurridoMin / a.totalMin) * 100
      return `<section class="now" aria-labelledby="t-ahora">
        <div class="now-head"><h2 id="t-ahora" class="now-kicker"><span class="pawn sm"></span>Ahora</h2><span class="now-left num">${a.quedan}</span></div>
        <button class="now-title" type="button">${esc(a.titulo)}</button>
        <div class="measure" role="meter" aria-valuemin="0" aria-valuemax="${a.totalMin}" aria-valuenow="${a.transcurridoMin}" aria-valuetext="${a.transcurridoMin} de ${a.totalMin} minutos, de ${a.inicio} a ${a.fin}">
          <div class="measure-line"><span class="measure-done" style="width:${pct}%"></span></div>
          <div class="measure-ends meta num"><span>${a.inicio}</span><span class="measure-dur-txt">${a.duracion}</span><span>${a.fin}</span></div>
        </div>
        <dl class="props">
          <div><dt>Proyecto</dt><dd><span class="dot" style="background:${p.color}"></span>${p.nombre}</dd></div>
          <div><dt>Prioridad</dt><dd>${window.NX_DIR.prio(a.prioridad)}</dd></div>
          <div><dt>Energía</dt><dd>${a.energia}</dd></div>
          <div><dt>Objetivo</dt><dd>${esc(a.objetivo)}</dd></div>
        </dl>
        <div class="now-reward"><span class="meta">Al terminarla: <strong class="num">+40 XP</strong>, una casilla más</span>${track({ preview: true })}</div>
        <div class="now-actions">
          <button class="btn btn-primary" type="button">${ic('timer', 14)}Empezar foco</button>
          <button class="btn btn-secondary" type="button" data-celebrate="now">${ic('check', 14)}Hecha</button>
          <button class="btn btn-ghost" type="button">Pasar a mañana</button>
        </div>
      </section>`
    },

    celebrate(el, { reduced, now }) {
      const piece = now ? el.querySelector('.now-reward .pawn') : el.querySelector('.status')
      if (reduced) {
        piece && piece.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 200 })
        return
      }
      piece &&
        piece.animate(
          [{ translate: '0 0', scale: 1 }, { translate: now ? '14px -12px' : '0 -9px', scale: 1.15, offset: 0.45 }, { translate: now ? '28px 0' : '0 0', scale: 1 }],
          { duration: 520, easing: 'cubic-bezier(.34,1.4,.64,1)' },
        )
      const tag = document.createElement('span')
      tag.className = 'xp-pop num'
      tag.textContent = now ? '+40 XP' : '+20 XP'
      const anchor = now ? el.querySelector('.now-reward') : el
      anchor.appendChild(tag)
      tag.animate(
        [
          { opacity: 0, translate: '0 4px' },
          { opacity: 1, translate: '0 -6px', offset: 0.35 },
          { opacity: 0, translate: '0 -16px' },
        ],
        { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' },
      ).finished.then(() => tag.remove())
    },
  }
})()
