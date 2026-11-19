// Retos R0 · Vista D · Mezcla (la de por defecto): las filas de A con la cadena de B. En lugar del
// medidor de progreso, cada fila enseña sus últimos 7 días (celdas con forma por estado), así que la
// racha y los escudos se ven sin abrir el detalle. Solo pinta la lista: el resto es de base.js.
;(function () {
  window.RT_V = window.RT_V || {}

  function fila(c, r) {
    const { H, B } = c
    const hoy = r.hoyHecho ? (r.hoyNoUsado ? `${H.ic('shield-off', 12)}Hoy no` : `${H.ic('check', 12)}Hecho hoy`) : 'Por marcar'
    return `<li class="rr rr-d" data-reto="${r.id}" data-item>
      <button class="mark-btn" type="button" data-marcar="${r.id}" aria-label="Marcar hoy: ${H.esc(r.titulo)}"${r.hoyHecho ? ' disabled' : ''}>${H.status(r.hoyHecho ? 'hecho' : 'hoy')}</button>
      <button class="r-open" type="button" data-open="${r.id}" data-focus-key="open-${r.id}"><span class="t">${H.esc(r.titulo)}</span>${r.ultimoDia ? '<span class="badge badge-accent">Último día</span>' : ''}</button>
      <span class="rr-racha">${H.racha(r)}</span>
      <span class="rr-chain">${B.chain(c, r, { ultimos: 7, mini: true })}</span>
      <span class="rr-esc">${H.escudos(r)}</span>
      <span class="rr-dia num">Día ${r.diaActual} de ${r.duracion}</span>
      <span class="rr-hoy${r.hoyHecho ? ' is-done' : ''}">${hoy}</span>
    </li>`
  }

  function lista(c) {
    return `<div class="card r-table">
      <div class="rr-cols rr-d" aria-hidden="true"><span></span><span>Reto</span><span>Racha</span><span>Últimos 7 días</span><span>Escudos</span><span>Progreso</span><span>Hoy</span></div>
      <ul>${c.M.retos.map((r) => fila(c, r)).join('')}</ul>
    </div>${c.B.cumplidosRows(c)}`
  }

  window.RT_V.d = { lista }
})()
