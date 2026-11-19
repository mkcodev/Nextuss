// Retos R0 · Vista B · Cadena: «La racha es la protagonista: cada día es una celda.»
// Cada reto propio es una tarjeta con su cadena completa de días. Es la vista que mejor enseña la
// racha y los escudos, a costa de espacio. Solo pinta la lista: el resto es de base.js.
;(function () {
  window.RT_V = window.RT_V || {}

  function tarjeta(c, r) {
    const { H, B } = c
    return `<article class="card b-card${r.hoyHecho ? ' is-today-done' : ''}" data-reto="${r.id}" data-item>
      <div class="b-card-h">
        <button class="b-card-t" type="button" data-open="${r.id}" data-focus-key="open-${r.id}">${H.esc(r.titulo)}</button>
        <span class="b-streak" title="Racha actual">${H.ic('flame', 16)}<span class="num">${r.racha}</span></span>
      </div>
      ${r.ultimoDia ? '<span class="badge badge-accent b-last">Último día</span>' : ''}
      ${B.chain(c, r)}
      <div class="b-card-f">
        <span class="num muted">Día ${r.diaActual} de ${r.duracion}</span>${H.escudos(r)}
        ${r.hoyHecho ? `<span class="b-done">${H.ic('check', 14)}${r.hoyNoUsado ? 'Hoy no' : 'Hecho hoy'}</span>` : `<button class="btn btn-secondary btn-sm" type="button" data-marcar="${r.id}">${H.status('hoy', 14)}Marcar hoy</button>`}
      </div>
    </article>`
  }

  function cumplidos(c) {
    const { M, H, RT, B } = c
    if (!M.cumplidos.length) return ''
    return `<div class="b-cum"><div class="r-sec-h"><h3 class="h-section">Cumplidos</h3><span class="r-count num">${M.cumplidos.length}</span></div>
      <div class="b-grid">${M.cumplidos
        .map(
          (r) => `<article class="card b-card is-cumplido" data-reto="${r.id}"><div class="b-card-h"><button class="b-card-t" type="button" data-open="${r.id}">${H.esc(r.titulo)}</button><span class="badge badge-accent">${H.ic('flag', 12)}Cumplido</span></div>
          ${B.chain(c, r)}<div class="b-card-f"><span class="num muted">${r.hechos} de ${r.duracion} días · terminó el ${RT.corta(r.fin)}</span>${H.escudos(r)}${H.xp(r.xpFinal)}</div></article>`,
        )
        .join('')}</div></div>`
  }

  function lista(c) {
    return `<div class="b-grid">${c.M.retos.map((r) => tarjeta(c, r)).join('')}</div>${cumplidos(c)}`
  }

  window.RT_V.b = { lista }
})()
