// Retos R0 · Vista C · Horizonte: «Los retos viven en el tiempo: ves dónde empiezan, dónde estás y
// cuánto falta.» Cada reto propio es una barra sobre un eje de fechas, con el marcador de «hoy» en
// tinta (como en «Tiempo de hoy»). Solo pinta la lista: el detalle, el formulario de crear y el vacío
// son los de base.js (la creación arrastrando la barra se descartó: ver README).
;(function () {
  window.RT_V = window.RT_V || {}
  const DAY = 864e5
  const N = (iso) => Math.round(new Date(iso + 'T12:00:00').getTime() / DAY)

  function rango(c, retos) {
    const { RT } = c
    const ini = Math.min(N(RT.HOY) - 7, ...retos.map((r) => N(r.inicio))) - 4
    const fin = Math.max(N(RT.HOY) + 14, ...retos.map((r) => N(r.finPrevisto))) + 4
    const total = fin - ini + 1
    return { ini, fin, total, pct: (iso) => ((N(iso) - ini) / total) * 100, w: (dias) => (dias / total) * 100 }
  }

  function eje(c, R) {
    const { RT } = c
    const ticks = []
    for (let n = R.ini; n <= R.fin; n++) {
      const d = new Date(n * DAY)
      // Sin ticks pegados al marcador de «hoy»: se taparían con su etiqueta.
      if ((d.getUTCDate() === 1 || d.getUTCDate() === 15) && Math.abs(n - N(RT.HOY)) > 4) ticks.push({ left: ((n - R.ini) / R.total) * 100, label: RT.corta(d.toISOString().slice(0, 10)), mes: d.getUTCDate() === 1 })
    }
    return `<div class="c-axis" aria-hidden="true">${ticks.map((t) => `<span class="c-tick${t.mes ? ' is-month' : ''}" style="left:${t.left}%">${t.label}</span>`).join('')}<span class="c-today-lbl" style="left:${R.pct(RT.HOY) + R.w(0.5)}%">hoy</span></div>`
  }

  const hoyLinea = (c, R) => `<span class="c-now" style="left:${R.pct(c.RT.HOY) + R.w(0.5)}%" aria-hidden="true"></span>`

  function barra(c, r, R) {
    const { H } = c
    const hechosHasta = r.estado === 'cumplido' ? r.duracion : r.diaActual - 1 + (r.hoyHecho ? 1 : 0)
    const marks = r.dias
      .filter((d) => ['escudo', 'hoyno', 'fallo'].includes(d.estado))
      .map((d) => `<span class="c-mark c-mark-${d.estado}" style="left:${((d.n - 0.5) / r.duracion) * 100}%" title="Día ${d.n}: ${H.DIA_LABEL[d.estado]}">${H.ic(d.estado === 'fallo' ? 'x' : 'shield', 10)}</span>`)
      .join('')
    return `<div class="c-bar${r.estado === 'cumplido' ? ' is-done' : ''}" style="left:${R.pct(r.inicio)}%;width:${R.w(r.duracion)}%"><span class="c-elapsed" style="width:${(hechosHasta / r.duracion) * 100}%"></span>${marks}</div>`
  }

  function fila(c, r, R) {
    const { H, RT } = c
    const cumplido = r.estado === 'cumplido'
    return `<li class="c-row${cumplido ? ' is-cumplido' : ''}" data-reto="${r.id}"${cumplido ? '' : ' data-item'}>
      <div class="c-lab">
        ${cumplido ? H.status('hecho', 14) : r.hoyHecho ? H.status('hecho') : `<button class="mark-btn" type="button" data-marcar="${r.id}" aria-label="Marcar hoy: ${H.esc(r.titulo)}">${H.status('hoy')}</button>`}
        <button class="c-name" type="button" data-open="${r.id}" data-focus-key="open-${r.id}">${H.esc(r.titulo)}</button>
        <span class="c-sub num">${cumplido ? `Cumplido el ${RT.corta(r.fin)}` : `${H.racha(r)}<span>${r.ultimoDia ? 'último día' : `quedan ${r.quedan} d`}</span>`}</span>
      </div>
      <div class="c-track">${barra(c, r, R)}${hoyLinea(c, R)}</div>
    </li>`
  }

  function lista(c) {
    const { M, H } = c
    const R = rango(c, [...M.retos, ...M.cumplidos])
    return `<div class="card c-tl">
      <div class="c-tl-h"><span class="c-legend faint"><span class="c-lg c-lg-el"></span>Hecho<span class="c-lg-i">${H.ic('shield', 10)}</span>Escudo<span class="c-lg-i c-lg-x">${H.ic('x', 10)}</span>Fallo</span></div>
      <div class="c-grid"><div class="c-lab c-lab-h"></div><div class="c-track c-track-h">${eje(c, R)}${hoyLinea(c, R)}</div></div>
      <ul class="c-rows">${M.retos.map((r) => fila(c, r, R)).join('')}
        ${M.cumplidos.length ? `<li class="c-sep">Cumplidos</li>${M.cumplidos.map((r) => fila(c, r, R)).join('')}` : ''}</ul>
    </div>`
  }

  window.RT_V.c = { lista }
})()
