// Render común de los mockups del rediseño v2: shell completo + Hoy + hoja de especímenes.
// Cada dirección define window.NX_DIR (antes de cargar este archivo) con su identidad y, si quiere,
// sus propias piezas firma: prio, status, nowBlock, dayCard, habitDay, celebrate.
// URL: ?theme=dark para el tema oscuro, ?static=1 para capturas (sin transiciones).
;(function () {
  const D = window.NX_DATOS
  const X = window.NX_DIR || {}
  const params = new URLSearchParams(location.search)
  document.documentElement.dataset.theme = params.get('theme') === 'dark' ? 'dark' : 'light'
  if (params.get('static') === '1') document.documentElement.classList.add('is-static')
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const ic = (name, size = 16) => `<i data-lucide="${name}" class="ic ic-${size}" aria-hidden="true"></i>`
  const kbd = (k) => k.split(' ').map((p) => `<kbd>${esc(p)}</kbd>`).join('')
  const proj = (id) => D.proyectos.find((p) => p.id === id)
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }

  // ------------------------------------------------------------------ piezas por defecto
  const def = {
    // Prioridad: tres barras por forma + nombre en texto (nunca solo color).
    prio(p, { label = true } = {}) {
      const on = { 1: 3, 2: 3, 3: 2, 4: 1 }[p]
      const bars = [5, 8, 11].map((h, i) => `<span class="bar${i < on ? ' on' : ''}" style="height:${h}px"></span>`).join('')
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}"><span class="prio-bars" aria-hidden="true">${bars}</span>${
        label ? `<span class="prio-label">${PRIO[p]}</span>` : `<span class="sr">Prioridad ${PRIO[p]}</span>`
      }</span>`
    },
    // Estado de tarea por forma: vacío, medio, lleno con marca.
    status(s) {
      const name = { pendiente: 'Pendiente', 'en-curso': 'En curso', hecha: 'Hecha' }[s]
      const inner =
        s === 'hecha'
          ? '<circle cx="8" cy="8" r="7" class="st-fill"/><path d="M4.8 8.2l2.1 2.1 4.3-4.5" class="st-check"/>'
          : s === 'en-curso'
            ? '<circle cx="8" cy="8" r="6.25" class="st-ring"/><path d="M8 3.2a4.8 4.8 0 0 1 0 9.6z" class="st-half"/>'
            : '<circle cx="8" cy="8" r="6.25" class="st-ring"/>'
      return `<svg class="status status-${s}" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="${name}">${inner}</svg>`
    },
    habitDay(state, i) {
      const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
      const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      const estado = { hecho: 'hecho', toca: 'toca', descanso: 'descanso' }[state]
      const hoy = i === D.hoyIndice
      return `<li class="wd wd-${state}${hoy ? ' wd-hoy' : ''}" aria-label="${nombres[i]}: ${estado}${hoy ? ', hoy' : ''}">${
        state === 'hecho' ? ic('check', 12) : `<span aria-hidden="true">${dias[i]}</span>`
      }</li>`
    },
    dayCard() {
      const j = D.jornada
      return `<section class="card daycard" aria-labelledby="t-dia">
        <div class="card-head"><h2 id="t-dia" class="h-section">Tiempo de hoy</h2><span class="meta num">${D.ahoraReloj}</span></div>
        <div class="dayline"><div class="dayline-track"><span class="dayline-fill" style="width:${(2.7 / 12) * 100}%"></span></div>
        <div class="dayline-ends meta num"><span>${j.inicio}</span><span>${j.fin}</span></div></div>
        <p class="meta">Te quedan <strong class="num">${j.restante}</strong> de jornada, <span class="num">${j.sinPlanificar}</span> sin planificar</p>
      </section>`
    },
    nowBlock() {
      const a = D.ahora
      const p = proj(a.proyecto)
      const pct = (a.transcurridoMin / a.totalMin) * 100
      return `<section class="now" aria-labelledby="t-ahora">
        <div class="now-head">${X.status ? X.status('en-curso') : def.status('en-curso')}<h2 id="t-ahora" class="now-kicker">Ahora</h2><span class="now-left num">${a.quedan}</span></div>
        <button class="now-title" type="button">${esc(a.titulo)}</button>
        <div class="measure" role="meter" aria-valuemin="0" aria-valuemax="${a.totalMin}" aria-valuenow="${a.transcurridoMin}" aria-valuetext="${a.transcurridoMin} de ${a.totalMin} minutos, de ${a.inicio} a ${a.fin}">
          <div class="measure-line"><span class="measure-done" style="width:${pct}%"></span><span class="measure-dur num">${a.duracion}</span></div>
          <div class="measure-ends meta num"><span>${a.inicio}</span><span>${a.fin}</span></div>
        </div>
        <dl class="props">
          <div><dt>Proyecto</dt><dd><span class="dot" style="background:${p.color}"></span>${p.nombre}</dd></div>
          <div><dt>Prioridad</dt><dd>${P.prio(a.prioridad)}</dd></div>
          <div><dt>Energía</dt><dd>${a.energia}</dd></div>
          <div><dt>Objetivo</dt><dd>${esc(a.objetivo)}</dd></div>
        </dl>
        <div class="now-actions">
          <button class="btn btn-primary" type="button">${ic('timer', 14)}Empezar foco</button>
          <button class="btn btn-secondary" type="button" data-celebrate="now">${ic('check', 14)}Hecha</button>
          <button class="btn btn-ghost" type="button">Pasar a mañana</button>
        </div>
        <p class="now-next meta">Después: <strong>${esc(a.siguiente.titulo)}</strong> <span class="num">${a.siguiente.cuando}</span></p>
      </section>`
    },
    // Microcelebración por defecto: un pulso de opacidad (las direcciones la sustituyen).
    celebrate(el) {
      el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' })
    },
  }
  const P = Object.assign({}, def, X)

  // ------------------------------------------------------------------ shell
  const navbar = () => `<header class="nav">
    <button class="icon-btn" type="button" aria-label="Plegar la barra lateral">${ic('panel-left')}</button>
    <a class="brand" href="#" aria-label="Nextuss, ir a Hoy">${X.brandMark || '<span class="brand-dot"></span>'}<span class="brand-name">Nextuss</span></a>
    <span class="crumb" aria-hidden="true">/</span><span class="crumb-here">Hoy</span>
    <button class="search" type="button" aria-label="Buscar o ejecutar (Ctrl K)">${ic('search', 14)}<span class="search-text">Buscar o ejecutar…</span><span class="search-kbd">${kbd('Ctrl K')}</span></button>
    <div class="nav-right">
      <button class="btn btn-secondary btn-sm" type="button" aria-label="Nueva tarea (i)">${ic('plus', 14)}<span class="hide-sm">Nuevo</span><span class="hide-sm">${kbd('i')}</span></button>
      <span class="level" title="Nivel ${D.usuario.nivel}">${ic('sparkles', 14)}<span class="num">Nv ${D.usuario.nivel}</span></span>
      <span class="avatar" role="img" aria-label="Tu perfil">${D.usuario.iniciales}</span>
      <button class="icon-btn hide-sm" type="button" aria-label="Mostrar el panel derecho" aria-pressed="true">${ic('panel-right')}</button>
    </div>
  </header>`

  const sidebar = () => `<aside class="side" aria-label="Navegación principal">
    <nav><ul class="side-list">${D.navegacion
      .map(
        (n) => `<li><a href="#" class="side-item${n.activo ? ' is-active' : ''}"${n.activo ? ' aria-current="page"' : ''}>${ic(n.icon)}<span>${n.label}</span><span class="side-kbd">${n.atajo}</span></a></li>`,
      )
      .join('')}</ul></nav>
    <div class="side-group"><h2 class="side-title">Proyectos</h2><ul class="side-list">${D.proyectos
      .map((p) => `<li><a href="#" class="side-item side-proj"><span class="dot" style="background:${p.color}"></span><span>${p.nombre}</span><span class="side-count num">${p.pendientes}</span></a></li>`)
      .join('')}</ul></div>
  </aside>`

  const dock = () => {
    const u = D.usuario
    return `<aside class="dock" aria-label="Panel derecho">
      <div class="dock-tabs" role="tablist" aria-label="Paneles">
        <button role="tab" aria-selected="true" class="dock-tab is-on">${ic('trophy', 14)}Progreso</button>
        <button role="tab" aria-selected="false" class="dock-tab" tabindex="-1">${ic('inbox', 14)}Captura</button>
        <button role="tab" aria-selected="false" class="dock-tab" tabindex="-1">${ic('timer', 14)}Enfoque</button>
      </div>
      <div class="dock-body" role="tabpanel">
        ${P.xpPanel ? P.xpPanel() : `<div class="xp">
          <div class="xp-head"><span class="xp-level">Nivel ${u.nivel}</span><span class="meta num">${u.xp.toLocaleString('es')} / ${u.xpSiguiente.toLocaleString('es')} XP</span></div>
          <div class="bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="${u.xpSiguiente}" aria-valuenow="${u.xp}" aria-label="XP del nivel"><span class="bar-fill" style="width:${(u.xp / u.xpSiguiente) * 100}%"></span></div>
          <p class="meta"><span class="num">+${u.xpHoy}</span> XP hoy</p></div>`}
        <h3 class="h-sub">Atributos</h3>
        <ul class="attrs">${D.dock.atributos
          .map(
            (a) => `<li><span class="attr-name">${a.nombre}</span><span class="meta num">nv ${a.nivel}</span>
          <span class="bar-track sm" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(a.progreso * 100)}" aria-label="${a.nombre}"><span class="bar-fill" style="width:${a.progreso * 100}%"></span></span></li>`,
          )
          .join('')}</ul>
        <h3 class="h-sub">Último logro</h3>
        <div class="badge-row">${ic('award', 18)}<div><strong>${D.dock.logro.titulo}</strong><p class="meta">${D.dock.logro.detalle}</p></div></div>
      </div>
    </aside>`
  }

  const mobnav = () => `<nav class="mobnav" aria-label="Navegación">
    ${[
      ['layout-grid', 'Hoy', true],
      ['calendar-range', 'Plan'],
      ['list-checks', 'Hábitos'],
      ['list-todo', 'Tareas'],
      ['plus', 'Crear'],
      ['panel-right', 'Panel'],
    ]
      .map(([i, l, on]) => `<a href="#" class="mob-item${on ? ' is-active' : ''}"${on ? ' aria-current="page"' : ''}>${ic(i, 18)}<span>${l}</span></a>`)
      .join('')}
  </nav>`

  // ------------------------------------------------------------------ Hoy
  const overdue = () => {
    const o = D.atrasadas
    return `<section class="block" aria-labelledby="t-atr">
      <div class="block-head"><h2 id="t-atr" class="h-section">Atrasadas <span class="count num">${o.total}</span></h2>
        <div class="block-actions"><button class="btn btn-ghost btn-sm" type="button">Mover todas a mañana</button><button class="btn btn-ghost btn-sm" type="button">Aparcar todas</button></div></div>
      <ul class="rows">${o.visibles
        .map(
          (t) => `<li class="row row-overdue"><span class="row-main"><span class="row-title">${esc(t.titulo)}</span>
          <span class="late">${ic('history', 12)}<span>${t.hace}</span></span></span>
          ${P.prio(t.prioridad, { label: false })}
          <button class="link-act" type="button">${ic('arrow-up-to-line', 14)}A hoy</button>
          <button class="icon-btn sm" type="button" aria-label="Más acciones">${ic('more-horizontal', 14)}</button></li>`,
        )
        .join('')}</ul>
      <button class="more" type="button">Ver las ${o.total - o.visibles.length} restantes</button>
    </section>`
  }

  const planRows = () => `<section class="block" aria-labelledby="t-plan">
    <div class="block-head"><h2 id="t-plan" class="h-section">Plan de hoy</h2><span class="meta">${D.plan.filter((t) => t.estado === 'hecha').length} de ${D.plan.length} hechas</span></div>
    <ul class="rows rows-plan">${D.plan
      .map((t, i) => {
        const p = proj(t.proyecto)
        return `<li class="row row-${t.estado}${i === 2 ? ' is-cursor' : ''}" data-i="${i}">
          <span class="row-time num">${t.hora || '—'}</span>
          <button class="status-btn" type="button" aria-label="${t.estado === 'hecha' ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${esc(t.titulo)}">${P.status(t.estado)}</button>
          <span class="row-main"><span class="row-title">${esc(t.titulo)}</span></span>
          ${P.prio(t.prioridad, { label: false })}
          <span class="row-proj hide-sm"><span class="dot" style="background:${p.color}"></span>${p.nombre}</span>
          <span class="row-est meta num hide-sm">${t.est || ''}</span></li>`
      })
      .join('')}</ul>
    <p class="hint meta hide-sm"><span>${kbd('j')}${kbd('k')} moverse</span><span>${kbd('Enter')} abrir</span><span>${kbd('x')} completar</span><span>${kbd('c')} nueva tarea</span></p>
  </section>`

  const kpis = () => {
    const k = D.kpi
    const max = Math.max(...k.foco.semana)
    return `<section class="block" aria-labelledby="t-kpi">
      <div class="block-head"><h2 id="t-kpi" class="h-section">Tu día en números</h2></div>
      <div class="kpis">
        <div class="kpi kpi-focus"><span class="kpi-label">Foco</span><span class="kpi-value num">${k.foco.valor}</span><span class="meta">${k.foco.meta}</span>
          <ol class="spark" aria-label="Minutos de foco de los últimos 7 días">${k.foco.semana
            .map((v, i) => `<li class="${i === 6 ? 'is-today' : ''}" style="--h:${Math.max(v / max, 0.04)}" aria-label="${k.foco.etiquetas[i]}: ${v} min">${i === 6 ? `<span class="sv num" aria-hidden="true">${v}</span>` : ''}<span class="sb"></span><span class="sl" aria-hidden="true">${k.foco.etiquetas[i]}</span></li>`)
            .join('')}</ol></div>
        <div class="kpi"><span class="kpi-label">Tareas</span><span class="kpi-value num">${k.tareas.valor}</span><span class="meta">${k.tareas.detalle}</span></div>
        <div class="kpi"><span class="kpi-label">Progreso</span><span class="kpi-value num">${k.xp.valor}</span><span class="meta">${k.xp.detalle}</span></div>
      </div>
    </section>`
  }

  const goal = () => {
    const g = D.objetivoSemana
    return `<section class="card goal" aria-labelledby="t-obj">
      <div class="card-head"><h2 id="t-obj" class="h-section">${ic('flag', 14)}Objetivo de la semana</h2></div>
      <p class="goal-title">${g.titulo}</p>
      <div class="bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="${g.total}" aria-valuenow="${g.hechas}" aria-label="Progreso del objetivo"><span class="bar-fill" style="width:${(g.hechas / g.total) * 100}%"></span></div>
      <p class="meta"><span class="num">${g.hechas} de ${g.total}</span> tareas, suma a ${g.atributo}</p>
    </section>`
  }

  const checkin = () => `<section class="card checkin" aria-labelledby="t-chk">
    <div class="card-head"><h2 id="t-chk" class="h-section">Check-in</h2><span class="meta">2 de 3</span></div>
    ${D.checkin.preguntas
      .map(
        (q) => `<div class="ck-row"><span class="ck-label">${q.label}</span><div class="ck-scale" role="radiogroup" aria-label="${q.label}">${[1, 2, 3, 4, 5]
          .map((n) => `<button type="button" role="radio" aria-checked="${q.valor === n}" class="ck${q.valor === n ? ' is-on' : ''}${q.valor && n < q.valor ? ' is-below' : ''}"${q.valor === n || (!q.valor && n === 1) ? '' : ' tabindex="-1"'}>${n}</button>`)
          .join('')}</div>${q.valor ? '' : '<span class="ck-pending meta">Sin responder</span>'}</div>`,
      )
      .join('')}
  </section>`

  const habits = () => `<section class="block" aria-labelledby="t-hab">
    <div class="block-head"><h2 id="t-hab" class="h-section">Hábitos de hoy</h2><button class="btn btn-ghost btn-sm" type="button">${ic('plus', 14)}Nuevo hábito</button></div>
    <ul class="habits">${D.habitos
      .map(
        (h) => `<li class="habit"><div class="habit-top">
          <button class="habit-check${h.hechoHoy ? ' is-done' : ''}" type="button" aria-pressed="${!!h.hechoHoy}" ${h.hechoHoy === null ? 'disabled aria-disabled="true"' : ''} aria-label="${h.nombre}: ${h.hechoHoy ? 'hecho hoy' : h.hechoHoy === null ? 'descanso hoy' : 'marcar como hecho'}">${h.hechoHoy ? ic('check', 14) : h.hechoHoy === null ? ic('moon', 12) : ''}</button>
          <span class="habit-name">${h.nombre}</span><span class="meta habit-meta">${h.hechoHoy === null ? 'Descanso hoy' : h.racha}</span></div>
          <ol class="week" aria-label="Semana de ${h.nombre}">${h.semana.map((s, i) => P.habitDay(s, i)).join('')}</ol></li>`,
      )
      .join('')}</ul>
  </section>`

  const unscheduled = () => `<button class="fold" type="button" aria-expanded="false">${ic('chevron-right', 14)}Sin planificar <span class="count num">${D.sinPlanificar}</span></button>`

  const today = () => `<div class="page">
    <header class="page-head">
      <div class="page-title"><button class="icon-btn" type="button" aria-label="Día anterior">${ic('chevron-left')}</button>
        <h1 class="h-page">${D.fecha}</h1><button class="icon-btn" type="button" aria-label="Día siguiente">${ic('chevron-right')}</button></div>
      <div class="page-actions"><span class="meta habits-count">${ic('check-check', 14)}<span class="num">2 de 4 hábitos</span></span>
        <button class="btn btn-ghost btn-sm" type="button">${ic('moon', 14)}Cerrar el día</button></div>
    </header>
    <div class="cols">
      <div class="col-main">${P.dayCard()}${P.nowBlock()}${overdue()}${planRows()}${kpis()}</div>
      <div class="col-side">${goal()}${checkin()}${habits()}${unscheduled()}</div>
    </div>
  </div>`

  // ------------------------------------------------------------------ hoja de especímenes
  const swatches = () =>
    (X.swatches || [])
      .map(([name, v]) => `<li class="sw"><span class="sw-chip" style="background:var(${v})"></span><span class="sw-name">${name}</span><code class="sw-val" data-var="${v}"></code></li>`)
      .join('')

  const specimens = () => `<section class="spec" aria-labelledby="t-spec">
    <header class="spec-head">
      <h2 id="t-spec" class="spec-name">${X.meta.nombre}</h2>
      <p class="spec-frase">${X.meta.frase}</p>
      <p class="meta">${X.meta.tipos}</p><p class="meta">${X.meta.nivel}</p>
    </header>
    <div class="spec-grid">
      <div class="spec-cell"><h3 class="h-sub">Paleta</h3><ul class="sws">${swatches()}</ul></div>
      <div class="spec-cell"><h3 class="h-sub">Escala tipográfica</h3>
        <p class="h-page">Martes, 17 de noviembre</p><p class="dialog-title">Nueva tarea</p><p class="h-section">Atrasadas</p>
        <p>Responder a la gestoría sobre el IVA del trimestre.</p><p class="ctl">Control, 13 px</p><p class="meta num">10:30 – 11:15, 45 min</p></div>
      <div class="spec-cell"><h3 class="h-sub">Botones</h3><div class="wrap">
        <button class="btn btn-primary" type="button">${ic('plus', 14)}Nueva tarea</button>
        <button class="btn btn-secondary" type="button">Hecha</button>
        <button class="btn btn-ghost" type="button">Cancelar</button>
        <button class="btn btn-danger" type="button">${ic('trash-2', 14)}Descartar</button>
        <button class="btn btn-primary btn-sm" type="button">Crear tarea <kbd class="kbd-on">Ctrl ↵</kbd></button>
        <button class="btn btn-secondary force-focus" type="button">Con foco de teclado</button></div></div>
      <div class="spec-cell"><h3 class="h-sub">Prioridad y estados</h3>
        <ul class="plain">${[1, 2, 3, 4].map((p) => `<li>${P.prio(p)}</li>`).join('')}</ul>
        <ul class="plain states">
          <li>${P.status('pendiente')}<span>Pendiente</span></li><li>${P.status('en-curso')}<span>En curso</span></li>
          <li class="row-hecha">${P.status('hecha')}<span class="row-title">Hecha</span></li>
          <li><span class="late">${ic('history', 12)}<span>Atrasada, hace 3 días</span></span></li></ul></div>
      <div class="spec-cell spec-wide"><h3 class="h-sub">Formulario de tarea</h3>
        <div class="dialog" role="group" aria-label="Ejemplo de formulario de tarea">
          <div class="dialog-body"><p class="title-field">Preparar la demo del jueves</p><p class="notes-field meta">Añade notas…</p>
          <div class="chips"><button class="chip" type="button">${P.prio(1)}</button><button class="chip" type="button">${ic('calendar', 14)}Hoy</button>
          <button class="chip" type="button"><span class="dot" style="background:#2f7d6b"></span>Trabajo</button><button class="chip is-empty" type="button">${ic('timer', 14)}Estimación</button></div>
          <button class="fold" type="button" aria-expanded="false">${ic('chevron-right', 14)}Más opciones <span class="meta">energía, etiquetas, objetivo</span></button></div>
          <footer class="dialog-foot"><label class="switch-label"><span class="switch" role="switch" aria-checked="true" tabindex="0"><span></span></span>Crear otra</label>
          <span class="grow"></span><button class="btn btn-ghost" type="button">Cancelar</button><button class="btn btn-primary" type="button">Crear tarea <kbd class="kbd-on">Ctrl ↵</kbd></button></footer>
        </div></div>
      <div class="spec-cell"><h3 class="h-sub">Menú</h3><ul class="menu" role="menu" aria-label="Acciones de la tarea">
        <li role="menuitem" tabindex="-1" class="is-hover">${ic('sunrise', 14)}Pasar a mañana</li><li role="menuitem" tabindex="-1">${ic('signal', 14)}Cambiar prioridad</li>
        <li role="menuitem" tabindex="-1">${ic('archive', 14)}Aparcar</li><li class="sep" role="separator"></li><li role="menuitem" tabindex="-1" class="danger">${ic('trash-2', 14)}Eliminar</li></ul></div>
      <div class="spec-cell"><h3 class="h-sub">Controles</h3>
        <input class="input" type="text" placeholder="Buscar en tareas" aria-label="Buscar en tareas">
        <div class="seg" role="tablist" aria-label="Vista"><button role="tab" aria-selected="true" class="is-on">Día</button><button role="tab" aria-selected="false" tabindex="-1">Semana</button><button role="tab" aria-selected="false" tabindex="-1">Mes</button></div>
        <div class="wrap"><label class="switch-label"><span class="switch" role="switch" aria-checked="true" tabindex="0"><span></span></span>Microcelebración</label>
        <label class="switch-label"><span class="switch" role="switch" aria-checked="false" tabindex="0"><span></span></span>Sonido</label></div></div>
      <div class="spec-cell"><h3 class="h-sub">Carga</h3><div class="skel-list" aria-busy="true" aria-label="Cargando"><span class="skel"></span><span class="skel"></span><span class="skel short"></span></div></div>
      <div class="spec-cell"><h3 class="h-sub">Vacío</h3><div class="empty">${ic('target', 18)}<p class="h-section">Sin hábitos programados para hoy</p>
        <p class="meta">Crea tu primer hábito y empieza una racha.</p><button class="btn btn-primary btn-sm" type="button">${ic('plus', 14)}Crear hábito</button></div></div>
      <div class="spec-cell"><h3 class="h-sub">Microcelebración</h3>
        <ul class="rows"><li class="row row-pendiente" id="demo-row"><button class="status-btn" type="button" aria-label="Completar la tarea de ejemplo">${P.status('pendiente')}</button>
        <span class="row-main"><span class="row-title">Llamar al dentista</span></span></li></ul>
        <p class="meta">${X.meta.celebracion}</p>
        <button class="btn btn-secondary btn-sm" type="button" id="demo-play">${ic('play', 14)}Reproducir</button></div>
    </div>
    <p class="meta spec-foot">Mockup estático con datos de ejemplo. No es código de producción.</p>
  </section>`

  // ------------------------------------------------------------------ montaje
  document.getElementById('app').innerHTML = `<div class="app">${navbar()}<div class="shell">${sidebar()}<main class="main" id="main">${today()}</main>${dock()}</div>${mobnav()}</div>${specimens()}<p id="live" class="sr" aria-live="polite"></p>`
  window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } })

  document.querySelectorAll('.sw-val').forEach((el) => {
    el.textContent = getComputedStyle(document.documentElement).getPropertyValue(el.dataset.var).trim()
  })

  // Completar una tarea: cambia el estado (forma + texto) y dispara la microcelebración.
  const complete = (row) => {
    const done = !row.classList.contains('row-hecha')
    row.classList.toggle('row-hecha', done)
    row.classList.toggle('row-pendiente', !done)
    const btn = row.querySelector('.status-btn')
    btn.innerHTML = P.status(done ? 'hecha' : 'pendiente')
    const title = row.querySelector('.row-title')?.textContent || 'la tarea'
    btn.setAttribute('aria-label', `${done ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${title}`)
    document.getElementById('live').textContent = done ? `Hecha: ${title}` : `Pendiente: ${title}`
    if (done) P.celebrate(row, { reduced: reduced() })
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.status-btn')
    if (b) complete(b.closest('.row'))
    if (e.target.closest('#demo-play')) {
      const r = document.getElementById('demo-row')
      if (r.classList.contains('row-hecha')) complete(r)
      requestAnimationFrame(() => complete(r))
    }
    const n = e.target.closest('[data-celebrate="now"]')
    if (n) P.celebrate(n.closest('.now'), { reduced: reduced(), now: true })
  })
})()
