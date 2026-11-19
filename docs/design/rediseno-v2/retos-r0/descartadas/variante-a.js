// DESCARTADA (R0): vista A · Registro. Se quita del selector porque era D sin la cadena de 7 días; sus
// atajos de teclado (j/k, x, c, n) pasaron a D. Se conserva como referencia. Para recuperarla: moverla
// a la raíz, cargar el script en index.html y añadir ['a', 'list', 'Registro'] a VISTAS en base.js.
// Usa las reglas .rr-a de retos.css.
// Retos R0 · Vista A · Registro: «Los retos son filas: densas, rápidas, desde el teclado.»
// Tabla al estilo de las incidencias, con el progreso como medidor fino (día N de M). Es la vista más
// compacta; la racha y los escudos son un número y unos iconos. Solo pinta la lista: el resto es de base.js.
;(function () {
  window.RT_V = window.RT_V || {}

  function fila(c, r) {
    const { H } = c
    const hoy = r.hoyHecho ? (r.hoyNoUsado ? `${H.ic('shield-off', 12)}Hoy no` : `${H.ic('check', 12)}Hecho hoy`) : 'Por marcar'
    return `<li class="rr rr-a" data-reto="${r.id}" data-item>
      <button class="mark-btn" type="button" data-marcar="${r.id}" aria-label="Marcar hoy: ${H.esc(r.titulo)}"${r.hoyHecho ? ' disabled' : ''}>${H.status(r.hoyHecho ? 'hecho' : 'hoy')}</button>
      <button class="r-open" type="button" data-open="${r.id}" data-focus-key="open-${r.id}"><span class="t">${H.esc(r.titulo)}</span>${r.ultimoDia ? '<span class="badge badge-accent">Último día</span>' : ''}</button>
      <span class="rr-racha">${H.racha(r)}</span>
      <span class="rr-esc">${H.escudos(r)}</span>
      <span class="rr-dia"><span class="num">Día ${r.diaActual} de ${r.duracion}</span>${H.meter((r.diaActual / r.duracion) * 100, `Día ${r.diaActual} de ${r.duracion}`)}</span>
      <span class="rr-hoy${r.hoyHecho ? ' is-done' : ''}">${hoy}</span>
    </li>`
  }

  function lista(c) {
    return `<div class="card r-table">
      <div class="rr-cols rr-a" aria-hidden="true"><span></span><span>Reto</span><span>Racha</span><span>Escudos</span><span>Progreso</span><span>Hoy</span></div>
      <ul>${c.M.retos.map((r) => fila(c, r)).join('')}</ul>
    </div>${c.B.cumplidosRows(c)}`
  }

  window.RT_V.a = { lista }
})()
