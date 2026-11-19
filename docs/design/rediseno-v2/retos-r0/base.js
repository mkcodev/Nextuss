// Retos R0 · base común de la página /retos. Las tres vistas (D Mezcla, B Cadena y C Horizonte)
// comparten TODO esto: cabecera, misiones, selector de vista, detalle (ficha lateral con calendario),
// crear reto, estado vacío, celebración y resumen en Hoy. Cada vista solo aporta `lista(c)`: cómo se
// pinta la lista de retos propios y de cumplidos (variante-d/b/c.js). A Registro se descartó: ver README.
//
// Cada vista marca sus retos activos con `data-reto="<id>" data-item` y dentro un `data-open="<id>"`;
// la base se encarga del cursor con teclado (j/k), de marcar (x) y de abrir el detalle.
;(function () {
  let cursor = 0
  let cursorOn = false
  const VISTAS = [
    ['d', 'layers', 'Mezcla'],
    ['b', 'grid-3x3', 'Cadena'],
    ['c', 'chart-gantt', 'Horizonte'],
  ]
  const N = (iso) => Math.round(new Date(iso + 'T12:00:00').getTime() / 864e5)
  const clampDur = (n) => Math.max(1, Math.min(365, Math.round(n) || 1))
  const colsFor = (n) => (n <= 21 ? n : Math.ceil(n / Math.ceil(n / 22)))

  // ------------------------------------------------------------------ piezas compartidas con las vistas
  // Cadena de días: una celda por día, con una forma por estado (no solo color).
  function chain(c, r, { ultimos = 0, mini = false } = {}) {
    const { H, RT } = c
    const dias = ultimos ? r.dias.filter((d) => d.estado !== 'futuro').slice(-ultimos) : r.dias
    const cols = ultimos || colsFor(r.duracion)
    return `<ol class="chain${mini ? ' chain-mini' : ''}" style="--cols:${cols}" aria-label="${ultimos ? `Últimos ${dias.length} días` : `Cadena de ${r.duracion} días`}">${dias
      .map(
        (d) => `<li class="day day-${d.estado}" title="Día ${d.n}, ${RT.larga(d.fecha)}: ${H.DIA_LABEL[d.estado]}"><span class="sr">Día ${d.n}: ${H.DIA_LABEL[d.estado]}</span>${
          d.estado === 'escudo' || d.estado === 'hoyno' ? H.ic('shield', mini ? 8 : 9) : d.estado === 'fallo' ? H.ic('x', mini ? 8 : 9) : ''
        }</li>`,
      )
      .join('')}</ol>`
  }

  // Cumplidos como filas (los usa Mezcla).
  function cumplidosRows(c) {
    const { M, H, RT } = c
    if (!M.cumplidos.length) return ''
    return `<details class="r-done" open><summary><span class="h-section">Cumplidos</span><span class="r-count num">${M.cumplidos.length}</span>${H.ic('chevron-down', 14, 'faint')}</summary>
      <ul class="card r-list">${M.cumplidos
        .map(
          (r) => `<li class="rr rr-cum" data-reto="${r.id}">${H.status('hecho')}<button class="r-open" type="button" data-open="${r.id}"><span class="t">${H.esc(r.titulo)}</span></button>
          <span class="faint num r-cum-meta">${r.hechos} de ${r.duracion} días hechos · terminó el ${RT.corta(r.fin)}</span>${H.escudos(r)}<span class="badge badge-accent">${H.ic('flag', 12)}Cumplido</span></li>`,
        )
        .join('')}</ul></details>`
  }

  // ------------------------------------------------------------------ página
  const head = (c) => {
    const { M, H } = c
    const pm = M.retos.filter((r) => !r.hoyHecho).length
    const sub = M.retos.length || M.cumplidos.length ? `${M.retos.length} activos · ${pm} por marcar hoy · ${M.cumplidos.length} ${M.cumplidos.length === 1 ? 'cumplido' : 'cumplidos'}` : 'Misiones del día y retos que te pones tú'
    return `<div class="page-head"><div><h1 class="h-page">Retos</h1><p class="page-sub">${sub}</p></div>
      <div class="page-actions"><button class="btn btn-primary" type="button" data-new data-focus-key="new">${H.ic('plus', 14)}Nuevo reto<span class="hide-sm">${H.kbd('c')}</span></button></div></div>`
  }

  function misiones(c) {
    const { M, H, st } = c
    if (st.primer)
      return `<section class="r-sec" aria-labelledby="r-mis"><div class="r-sec-h"><h2 id="r-mis" class="h-section">Misiones de hoy</h2></div>
        <div class="card r-first">${H.ic('sunrise', 16, 'faint')}<p><b>Tus primeras misiones llegan mañana.</b> <span class="muted">Salen de lo que ya haces en Nextuss: tareas, foco, check-in y hábitos. Hoy aún no hay datos con los que proponerlas.</span></p></div></section>`
    const hechas = M.misiones.filter((m) => m.actual >= m.meta).length
    return `<section class="r-sec" aria-labelledby="r-mis">
      <div class="r-sec-h"><h2 id="r-mis" class="h-section">Misiones de hoy</h2><span class="r-count num">${hechas} de ${M.misiones.length}</span>
        <span class="r-sec-meta">Salen de tu actividad · se renuevan a las <span class="mono">00:00</span></span>${H.xp(M.misiones.reduce((s, m) => s + m.xp, 0))}</div>
      <ul class="card r-list">${M.misiones
        .map((m) => {
          const done = m.actual >= m.meta
          return `<li class="rr rr-mis${done ? ' is-done' : ''}" data-mision="${m.id}">
            ${H.status(H.misionEstado(m))}
            <span class="t">${H.esc(m.titulo)}</span>
            <span class="r-src">${H.ic(m.icono, 12)}${m.fuente}</span>
            <span class="r-prog num">${done ? `Cumplida <span class="mono faint">${m.cumplidaA}</span>` : H.misionProgreso(m)}</span>
            <span class="r-mini">${H.meter((m.actual / m.meta) * 100, `${m.titulo}: ${H.misionProgreso(m)}`)}</span>
            ${H.xp(m.xp)}
          </li>`
        })
        .join('')}</ul>
    </section>`
  }

  // Selector de vista de la lista de retos (como lista / tablero / cronograma en Linear). Es un
  // radiogroup con tabindex móvil: flechas para cambiar. La vista elegida se recuerda.
  function selector(c) {
    const { H, st } = c
    return `<div class="seg r-views" role="radiogroup" aria-label="Vista de la lista de retos">${VISTAS.map(
      ([k, i, l]) => `<button type="button" role="radio" aria-checked="${st.v === k}" data-view="${k}" tabindex="${st.v === k ? 0 : -1}">${H.ic(i, 14)}<span>${l}</span></button>`,
    ).join('')}</div>`
  }

  function seccionRetos(c) {
    const { M, H, st } = c
    const V = window.RT_V[st.v]
    return `<section class="r-sec" aria-labelledby="r-pro">
      <div class="r-sec-h"><h2 id="r-pro" class="h-section">Retos propios</h2><span class="r-count num">${M.retos.length}</span>${selector(c)}</div>
      <div class="r-area" data-vista-activa="${st.v}">${V.lista(c)}</div>
      <p class="r-keys hide-sm">${H.kbd('j')}${H.kbd('k')} moverse · ${H.kbd('x')} marcar hoy · ${H.kbd('Enter')} abrir · ${H.kbd('c')} o ${H.kbd('n')} nuevo reto</p>
    </section>`
  }

  // Estado vacío: cadena fantasma y plantillas. Sin selector de vista: no hay lista que pintar.
  function vacioMain(c) {
    const { H, RT } = c
    const ghost = RT.reto({ id: 'ghost', titulo: '', inicio: RT.HOY, duracion: 30, escudos: 0 })
    return (
      head(c) +
      misiones(c) +
      `<section class="r-sec" aria-labelledby="r-pro"><div class="r-sec-h"><h2 id="r-pro" class="h-section">Retos propios</h2></div>
      <div class="card r-empty">
        <div class="r-empty-txt"><p class="r-empty-t">Tu primera cadena empieza hoy</p>
          <p class="muted">Un reto propio es algo que marcas cada día durante un tiempo fijo. Los escudos cubren los días que se te escapen, sin romper la racha.</p></div>
        <div class="r-ghost-chain">${chain(c, ghost)}</div>
        <div><p class="r-h3">Empieza con una plantilla</p>
          <ul class="r-ghosts">${RT.plantillas
            .map((p, i) => `<li><button type="button" class="r-ghost" data-plantilla="${i}">${H.ic('plus', 14, 'faint')}<span class="t">${H.esc(p.titulo)}</span><span class="faint num">${p.duracion} días · ${p.escudos} ${p.escudos === 1 ? 'escudo' : 'escudos'}</span><span class="link">Usar</span></button></li>`)
            .join('')}</ul></div>
        <div class="r-empty-cta"><button class="btn btn-primary" type="button" data-new>${H.ic('plus', 14)}Nuevo reto<span class="hide-sm">${H.kbd('c')}</span></button><span class="faint">o escribe el tuyo desde cero</span></div>
      </div></section>`
    )
  }

  function pagina(c) {
    const { M } = c
    if (!M.retos.length && !M.cumplidos.length) return vacioMain(c)
    return head(c) + misiones(c) + seccionRetos(c)
  }

  // ------------------------------------------------------------------ detalle (ficha lateral con calendario)
  function calendario(c, r) {
    const { H, RT } = c
    const offset = (new Date(r.inicio + 'T12:00:00').getDay() + 6) % 7
    const celdas = Array.from({ length: offset }, () => '<li class="cal-pad" aria-hidden="true"></li>')
    let mes = -1
    for (const d of r.dias) {
      const f = new Date(d.fecha + 'T12:00:00')
      const nuevoMes = f.getMonth() !== mes
      mes = f.getMonth()
      celdas.push(
        `<li class="cal-day day-${d.estado}" title="${RT.larga(d.fecha)}: ${H.DIA_LABEL[d.estado]}"><span class="cal-n num">${f.getDate()}${nuevoMes ? ` <span class="cal-m">${RT.corta(d.fecha).split(' ')[1]}</span>` : ''}</span>
        <span class="cal-mark" aria-hidden="true">${d.estado === 'escudo' || d.estado === 'hoyno' ? H.ic('shield', 12) : d.estado === 'fallo' ? H.ic('x', 12) : d.estado === 'hecho' ? H.ic('check', 12) : ''}</span><span class="sr">${H.DIA_LABEL[d.estado]}</span></li>`,
      )
    }
    return `<div class="cal"><ol class="cal-head" aria-hidden="true">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<li>${d}</li>`).join('')}</ol><ol class="cal-grid" aria-label="Calendario del reto">${celdas.join('')}</ol></div>
      <ul class="legend" aria-label="Leyenda"><li><span class="day day-hecho day-sm"></span>Hecho</li><li><span class="day day-escudo day-sm">${H.ic('shield', 9)}</span>Escudo</li><li><span class="day day-fallo day-sm">${H.ic('x', 9)}</span>Fallado</li><li><span class="day day-hoy day-sm"></span>Hoy</li></ul>`
  }

  function registro(c, r) {
    const { H, RT } = c
    const ev = r.dias
      .filter((d) => d.estado !== 'futuro')
      .slice()
      .reverse()
      .filter((d, i) => i < 3 || ['escudo', 'hoyno', 'fallo'].includes(d.estado))
      .slice(0, 6)
    return `<ul class="r-log">${ev
      .map(
        (d) => `<li><span class="day day-${d.estado} day-sm" aria-hidden="true">${d.estado === 'escudo' || d.estado === 'hoyno' ? H.ic('shield', 9) : d.estado === 'fallo' ? H.ic('x', 9) : ''}</span>
        <span class="num faint">${RT.larga(d.fecha)}</span><span>${H.DIA_LABEL[d.estado]}${d.estado === 'fallo' ? ': la racha vuelve a 0' : ''}</span></li>`,
      )
      .join('')}</ul>`
  }

  function ficha(c) {
    const { H, RT, st } = c
    const r = c.find(st.sel || 'leer') || c.M.retos[0] || c.M.cumplidos[0]
    const cumplido = r.estado === 'cumplido'
    const acciones = cumplido
      ? `<p class="r-done-msg">${H.ic('flag', 14)}Cumplido el ${RT.corta(r.fin)}: ${r.hechos} de ${r.duracion} días hechos<span class="xp" data-gam>+${r.xpFinal} XP</span></p>`
      : r.hoyHecho
        ? `<p class="r-done-msg">${H.ic('check', 14)}${r.hoyNoUsado ? 'Hoy no: día cubierto con un escudo' : 'Hoy ya está marcado'}</p>`
        : `<button class="btn btn-primary" type="button" data-marcar="${r.id}">${H.ic('check', 14)}${r.ultimoDia ? 'Marcar y cumplir el reto' : 'Marcar hoy'}<span class="hide-sm">${H.kbd('x')}</span></button>
           <button class="btn btn-secondary" type="button" data-hoyno="${r.id}"${r.escudosLibres ? '' : ' disabled'} title="${r.escudosLibres ? 'Gasta un escudo: la racha sigue sin marcar el día' : 'No te quedan escudos'}">${H.ic('shield-off', 14)}Hoy no<span class="faint">${r.escudosLibres ? '· gasta 1 escudo' : '· sin escudos'}</span></button>`
    return `<div class="scrim" data-close></div>
      <aside class="r-sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t" data-cel="${r.id}">
        <div class="r-sheet-h"><span class="badge">${H.ic('flag', 12)}Reto propio</span>${r.ultimoDia && !cumplido ? '<span class="badge badge-accent">Último día</span>' : ''}
          <button class="icon-btn" type="button" data-close data-autofocus aria-label="Cerrar (Esc)" style="margin-left:auto">${H.ic('x')}</button></div>
        <h2 id="sheet-t" class="r-sheet-t">${H.esc(r.titulo)}</h2>${r.nota ? `<p class="muted r-sheet-note">${H.esc(r.nota)}</p>` : ''}
        <div class="kpis">
          <div class="cell"><span class="c-label">Racha</span><span class="c-value">${r.racha} <span class="muted">${r.racha === 1 ? 'día' : 'días'}</span></span><span class="c-meta">mejor: ${H.dias(r.mejor)}</span></div>
          <div class="cell"><span class="c-label">Cumplimiento</span><span class="c-value">${r.cumplimiento} %</span><span class="c-meta">${r.hechos} días hechos</span></div>
        </div>
        <dl class="props">
          <div><dt>Progreso</dt><dd class="num">Día ${r.diaActual} de ${r.duracion}</dd></div>
          <div><dt>Fechas</dt><dd class="num">${RT.corta(r.inicio)} – ${RT.corta(r.finPrevisto)}</dd></div>
          <div><dt>Escudos</dt><dd>${H.escudos(r, { texto: true })}</dd></div>
          <div data-gam><dt>Recompensa</dt><dd class="num">+${r.xpDia} XP/día · +${r.xpFinal} al cumplir</dd></div>
        </dl>
        <section class="r-sheet-sec"><h3 class="r-h3">Calendario</h3>${calendario(c, r)}</section>
        <section class="r-sheet-sec"><h3 class="r-h3">Registro</h3>${registro(c, r)}</section>
        <div class="r-sheet-actions">${acciones}<button class="icon-btn" type="button" aria-label="Más acciones: editar, pausar o abandonar" style="margin-left:auto">${H.ic('ellipsis')}</button></div>
      </aside>`
  }

  // ------------------------------------------------------------------ crear reto (un solo formulario)
  function dialogCrear(c) {
    const { H, st } = c
    const pre = st.prefill
    const valor = pre ? `${pre.titulo} ${pre.duracion} días ${pre.escudos} escudos` : 'Leer 20 minutos 30 días 2 escudos'
    return `<div class="scrim" data-close></div>
    <div class="dialog r-create" role="dialog" aria-modal="true" aria-labelledby="cr-t">
      <div class="dialog-head"><h2 id="cr-t" class="h-section">Nuevo reto propio</h2><span style="margin-left:auto">${H.kbd('Esc')}</span></div>
      <div class="dialog-body">
        <input class="r-parse" id="cr-in" data-autofocus value="${H.esc(valor)}" aria-label="Qué reto, con su duración y sus escudos" aria-describedby="cr-help" autocomplete="off" />
        <p id="cr-help" class="faint r-help">Escribe la duración («30 días») y los escudos («2 escudos»): se detectan solos y puedes corregirlos abajo.</p>
        <div class="chips" id="cr-chips" aria-live="polite"></div>
        <div class="r-fields">
          <div class="field"><span id="cr-dur-l">Duración</span><div class="seg" role="radiogroup" aria-labelledby="cr-dur-l">${[7, 21, 30, 66].map((d) => `<button type="button" role="radio" data-dur="${d}">${d}</button>`).join('')}</div></div>
          <label class="field"><span>Días</span><input class="input num" id="cr-dias" type="number" min="1" max="365" inputmode="numeric" /></label>
          <label class="field"><span>Termina el</span><input class="input" id="cr-fin" type="date" min="${c.RT.HOY}" /></label>
          <div class="field"><span id="cr-esc-l">Escudos</span><div class="stepper" role="group" aria-labelledby="cr-esc-l"><button type="button" data-esc="-1" aria-label="Un escudo menos">${H.ic('minus', 14)}</button><output id="cr-esc" class="num"></output><button type="button" data-esc="1" aria-label="Un escudo más">${H.ic('plus', 14)}</button></div></div>
        </div>
        <p class="r-help faint">Un escudo cubre un día que no marques, sin romper la racha. No se recargan durante el reto.</p>
        <div class="r-preview" id="cr-prev"></div>
      </div>
      <div class="dialog-foot"><button class="btn btn-ghost" type="button" data-close>Cancelar</button><button class="btn btn-primary" type="button" id="cr-ok">Crear reto<span class="hide-sm">${H.kbd('Enter')}</span></button></div>
    </div>`
  }

  // «… 30 días», «2 escudos». El resto es el nombre.
  function parse(txt) {
    let duracion = null
    let escudos = null
    const t = txt
      .replace(/(\d{1,3})\s*d[ií]as?/i, (_, n) => ((duracion = Number(n)), ''))
      .replace(/(\d)\s*escudos?/i, (_, n) => ((escudos = Math.min(3, Number(n))), ''))
    return { titulo: t.replace(/\s+/g, ' ').trim(), duracion, escudos }
  }

  function wireCrear(c) {
    const { st, RT, H } = c
    const pre = st.prefill || { duracion: 30, escudos: 2 }
    const inp = document.getElementById('cr-in')
    const dias = document.getElementById('cr-dias')
    const fin = document.getElementById('cr-fin')
    let dur = pre.duracion
    let esc = pre.escudos
    const manual = { dur: false, esc: false }
    const upd = () => {
      const p = parse(inp.value)
      if (p.duracion && !manual.dur) dur = clampDur(p.duracion)
      if (p.escudos != null && !manual.esc) esc = p.escudos
      document.getElementById('cr-chips').innerHTML = [
        p.titulo && `<span class="chip">${H.ic('flag', 12)}${H.esc(p.titulo)}</span>`,
        `<span class="chip${p.duracion ? ' is-det' : ''}">${H.ic('calendar', 12)}${dur} días</span>`,
        `<span class="chip${p.escudos != null ? ' is-det' : ''}">${H.ic('shield', 12)}${esc} ${esc === 1 ? 'escudo' : 'escudos'}</span>`,
        `<span class="chip">${H.ic('play', 12)}Empieza hoy</span>`,
      ]
        .filter(Boolean)
        .join('')
      document.querySelectorAll('[data-dur]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.dur) === dur)))
      if (document.activeElement !== dias) dias.value = dur
      if (document.activeElement !== fin) fin.value = RT.add(RT.HOY, dur - 1)
      document.getElementById('cr-esc').textContent = esc
      const prev = RT.reto({ id: 'prev', titulo: '', inicio: RT.HOY, duracion: dur, escudos: esc })
      document.getElementById('cr-prev').innerHTML = `<div class="r-prev-txt">${H.ic('calendar-range', 14, 'faint')}<span>Del <b>${RT.larga(RT.HOY)}</b> al <b>${RT.larga(prev.finPrevisto)}</b> · ${dur} días · ${esc} ${esc === 1 ? 'escudo' : 'escudos'}</span>${H.xp(dur * 2)}</div>${chain(c, prev)}`
      window.lucide?.createIcons()
    }
    inp.addEventListener('input', upd)
    // Tres vías para la duración, ninguna obliga a arrastrar: atajos, campo de días y fecha de fin.
    document.querySelectorAll('[data-dur]').forEach((b) => b.addEventListener('click', () => ((dur = Number(b.dataset.dur)), (manual.dur = true), upd())))
    dias.addEventListener('input', () => ((dur = clampDur(Number(dias.value))), (manual.dur = true), upd()))
    fin.addEventListener('change', () => fin.value && ((dur = clampDur(N(fin.value) - N(RT.HOY) + 1)), (manual.dur = true), upd()))
    document.querySelectorAll('[data-esc]').forEach((b) =>
      b.addEventListener('click', () => {
        esc = Math.max(0, Math.min(3, esc + Number(b.dataset.esc)))
        manual.esc = true
        upd()
      }),
    )
    const ok = () => {
      const p = parse(inp.value)
      const r = c.A.crear({ titulo: p.titulo || 'Reto sin nombre', duracion: dur, escudos: esc })
      st.volverA = null
      c.nav('lista')
      c.fadeIn(document.querySelector(`[data-reto="${r.id}"]`))
      c.toast(`${H.ic('flag', 14)}<span>Reto creado: empieza hoy</span>`)
    }
    document.getElementById('cr-ok').addEventListener('click', ok)
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && ok())
    upd()
  }

  // ------------------------------------------------------------------ resumen en Hoy
  // Una celda ancha más de «Tu día en números», con el mismo formato (CELL, LABEL, VALUE y META).
  function hoyMain(c) {
    const { M, H } = c
    const hechas = M.misiones.filter((m) => m.actual >= m.meta).length
    const pm = M.retos.filter((r) => !r.hoyHecho).length
    const extra = `<div class="cell c-hoy-cell">
      <div class="c-hoy-sum"><span class="c-label">Retos</span><span class="c-value">${hechas} <span class="muted">de</span> ${M.misiones.length}</span><span class="c-meta">misiones hoy · ${pm} ${pm === 1 ? 'reto' : 'retos'} por marcar</span></div>
      <ul class="c-hoy-list">${M.retos
        .map(
          (r) => `<li data-reto="${r.id}">${r.hoyHecho ? H.status('hecho', 14) : `<button class="mark-btn" type="button" data-marcar="${r.id}" aria-label="Marcar hoy: ${H.esc(r.titulo)}">${H.status('hoy', 14)}</button>`}
          <span class="t">${H.esc(r.titulo)}</span><span class="c-mini" aria-hidden="true"><span style="width:${((r.diaActual - 1 + (r.hoyHecho ? 1 : 0)) / r.duracion) * 100}%"></span><i style="left:${((r.diaActual - 0.5) / r.duracion) * 100}%"></i></span><span class="faint num c-hoy-q">${r.ultimoDia ? 'último día' : `quedan ${r.quedan} d`}</span></li>`,
        )
        .join('')}</ul>
    </div>`
    return c.hoyPage({ numerosExtra: extra })
  }

  // ------------------------------------------------------------------ vistas de la base
  const lista = (c) => ({ main: pagina(c) })
  const detalle = (c) => ({ main: pagina(c), overlay: ficha(c) })
  const crear = (c) => ({ main: c.st.volverA === 'vacio' ? vacioMain(c) : pagina(c), overlay: dialogCrear(c) })
  const vacio = (c) => ({ main: vacioMain(c) })
  const hoy = (c) => ({ main: hoyMain(c) })

  function moverCursor(d) {
    const items = [...document.querySelectorAll('[data-item]')]
    if (!items.length) return
    // La primera pulsación solo muestra el cursor en el primer reto; las siguientes lo mueven.
    cursor = cursorOn ? Math.max(0, Math.min(items.length - 1, cursor + d)) : 0
    cursorOn = true
    items.forEach((it, i) => it.classList.toggle('is-cursor', i === cursor))
    items[cursor].querySelector('[data-open]')?.focus({ preventScroll: false })
  }

  function mount(c) {
    const { st } = c
    // Selector de vista: clic y flechas (radiogroup).
    const grp = document.querySelector('.r-views')
    if (grp) {
      grp.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => c.setView(b.dataset.view)))
      grp.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
        if (!d) return
        e.preventDefault()
        e.stopPropagation()
        const ks = VISTAS.map((v) => v[0])
        c.setView(ks[(ks.indexOf(st.v) + d + ks.length) % ks.length])
      })
    }
    // Cursor con teclado: solo se ve después de la primera pulsación de j/k.
    const items = [...document.querySelectorAll('[data-item]')]
    cursor = Math.min(cursor, Math.max(items.length - 1, 0))
    if (cursorOn) items[cursor]?.classList.add('is-cursor')
    if (st.vista === 'crear') wireCrear(c)
    else
      c.keys((e, { typing }) => {
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return
        if (st.vista === 'detalle') {
          const r = c.find(st.sel || 'leer')
          if (e.key === 'x' && r && !r.hoyHecho && r.estado !== 'cumplido') c.marcar(r.id)
          return
        }
        if (e.key === 'j' || e.key === 'ArrowDown') (e.preventDefault(), moverCursor(1))
        else if (e.key === 'k' || e.key === 'ArrowUp') (e.preventDefault(), moverCursor(-1))
        else if (e.key === 'x') {
          const id = items[cursor]?.dataset.reto
          if (id) c.marcar(id)
        } else if (e.key === 'c' || e.key === 'n') document.querySelector('[data-new]')?.click()
      })
    // Entrada de la ficha (muelle «soft», desde la derecha o desde abajo en móvil) y del diálogo (PRESET.dialog).
    if (st.anim && !c.isStatic && window.Motion) {
      const mob = c.mobile()
      const reduce = c.reduce()
      const sheet = document.querySelector('.r-sheet')
      const dlg = document.querySelector('.r-create')
      const scrim = document.querySelector('.scrim')
      if (scrim) window.Motion.animate(scrim, { opacity: [0, 1] }, { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] })
      if (sheet) window.Motion.animate(sheet, reduce ? { opacity: [0, 1] } : mob ? { y: ['100%', '0%'] } : { x: [40, 0], opacity: [0, 1] }, reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 40 })
      if (dlg && !mob) window.Motion.animate(dlg, reduce ? { opacity: [0, 1] } : { opacity: [0, 1], scale: [0.98, 1], y: [6, 0] }, reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 640, damping: 46 })
    }
    st.anim = false
  }

  window.RT_BASE = { chain, cumplidosRows, lista, detalle, crear, vacio, hoy, mount, VISTAS }
})()
