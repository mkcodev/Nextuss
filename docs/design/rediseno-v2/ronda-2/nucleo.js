// Ronda 2 del rediseño v2: render común (shell completo + Hoy + capas vivas).
// Parte de ronda-1/base.js, sin la hoja de especímenes: lo que enseñaba ahora es interacción real
// (paleta Ctrl K, captura rápida, modo foco, completar y cambio de tema) y vive en interacciones.js.
// Cada dirección define window.NX_DIR antes de cargar este archivo: meta, brandMark y, si quiere,
// sus piezas: prio, status, nowBlock, dayCard, habitDay, xpPanel, focusMode.
// URL: ?theme=dark · ?static=1 (sin movimiento, para capturas) · ?bare=1 (sin barra del mockup).
;(function () {
  const D = window.NX_DATOS
  const X = window.NX_DIR || {}
  const params = new URLSearchParams(location.search)
  document.documentElement.dataset.theme = (params.get('theme') || X.defaultTheme) === 'dark' ? 'dark' : 'light'
  if (params.get('static') === '1') document.documentElement.classList.add('is-static')
  if (params.get('bare') === '1') document.documentElement.classList.add('is-bare')

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const ic = (name, size = 16) => `<i data-lucide="${name}" class="ic ic-${size}" aria-hidden="true"></i>`
  const kbd = (k) => k.split(' ').map((p) => `<kbd>${esc(p)}</kbd>`).join('')
  const proj = (id) => D.proyectos.find((p) => p.id === id)
  const PRIO = { 1: 'Urgente', 2: 'Alta', 3: 'Media', 4: 'Baja' }
  const hechas = D.plan.filter((t) => t.estado === 'hecha').length

  // ------------------------------------------------------------------ piezas por defecto
  const def = {
    prio(p, { label = true } = {}) {
      const on = { 1: 3, 2: 3, 3: 2, 4: 1 }[p]
      const bars = [5, 8, 11].map((h, i) => `<span class="bar${i < on ? ' on' : ''}" style="height:${h}px"></span>`).join('')
      return `<span class="prio prio-${p}" title="Prioridad ${PRIO[p]}"><span class="prio-bars" aria-hidden="true">${bars}</span>${
        label ? `<span class="prio-label">${PRIO[p]}</span>` : `<span class="sr">Prioridad ${PRIO[p]}</span>`
      }</span>`
    },
    status(s) {
      const name = { pendiente: 'Pendiente', 'en-curso': 'En curso', hecha: 'Hecha' }[s]
      const inner =
        s === 'hecha'
          ? '<circle cx="8" cy="8" r="7" class="st-fill"/><path d="M4.8 8.2l2.1 2.1 4.3-4.5" class="st-check" pathLength="1"/>'
          : s === 'en-curso'
            ? '<circle cx="8" cy="8" r="6.25" class="st-ring"/><path d="M8 3.2a4.8 4.8 0 0 1 0 9.6z" class="st-half"/>'
            : '<circle cx="8" cy="8" r="6.25" class="st-ring"/>'
      return `<svg class="status status-${s}" viewBox="0 0 16 16" width="16" height="16" role="img" aria-label="${name}">${inner}</svg>`
    },
    habitDay(state, i) {
      const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
      const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
      const hoy = i === D.hoyIndice
      return `<li class="wd wd-${state}${hoy ? ' wd-hoy' : ''}" aria-label="${nombres[i]}: ${state}${hoy ? ', hoy' : ''}">${
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
      return `<section class="now" id="now" aria-labelledby="t-ahora">
        <div class="now-head">${P.status('en-curso')}<h2 id="t-ahora" class="now-kicker">Ahora</h2><span class="now-left num">${a.quedan}</span></div>
        <p class="now-title">${esc(a.titulo)}</p>
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
          <button class="btn btn-primary" type="button" data-act="foco">${ic('timer', 14)}Empezar foco ${kbd('f')}</button>
          <button class="btn btn-ghost" type="button">Pasar a mañana</button>
        </div>
        <p class="now-next meta">Después: <strong>${esc(a.siguiente.titulo)}</strong> <span class="num">${a.siguiente.cuando}</span></p>
      </section>`
    },
    // Modo foco por defecto: pantalla completa con temporizador, subtareas y salida con Esc.
    focusMode() {
      const a = D.ahora
      return `<div class="focus-in">
        <p class="focus-meta meta">${esc(proj(a.proyecto).nombre)}, hasta las <span class="num">${a.fin}</span></p>
        <h2 class="focus-title" id="focus-t">${esc(a.titulo)}</h2>
        <div class="focus-timer num" id="focus-timer" aria-live="off">33:00</div>
        <div class="focus-bar" aria-hidden="true"><span class="focus-fill" id="focus-fill"></span></div>
        <ul class="focus-subs">${D.foco.subtareas
          .map((s, i) => `<li><button type="button" class="sub${s.hecha ? ' is-done' : ''}" data-sub="${i}" aria-pressed="${s.hecha}">${P.status(s.hecha ? 'hecha' : 'pendiente')}<span>${esc(s.titulo)}</span></button></li>`)
          .join('')}</ul>
        <div class="focus-actions">
          <button class="btn btn-primary" type="button" id="focus-pause">${ic('pause', 14)}<span>Pausar</span></button>
          <button class="btn btn-ghost" type="button" data-close="focus">Salir ${kbd('Esc')}</button>
        </div>
      </div>`
    },
  }
  const P = Object.assign({}, def, X)
  window.NX_P = P

  // ------------------------------------------------------------------ shell
  const navbar = () => `<header class="nav">
    <button class="icon-btn" type="button" aria-label="Plegar la barra lateral">${ic('panel-left')}</button>
    <a class="brand" href="#" aria-label="Nextuss, ir a Hoy">${X.brandMark || '<span class="brand-dot"></span>'}<span class="brand-name">Nextuss</span></a>
    <span class="crumb" aria-hidden="true">/</span><span class="crumb-here">Hoy</span>
    <button class="search" type="button" data-act="paleta" aria-label="Buscar o ejecutar (Ctrl K)">${ic('search', 14)}<span class="search-text">Buscar o ejecutar…</span><span class="search-kbd">${kbd('Ctrl K')}</span></button>
    <div class="nav-right">
      <button class="btn btn-secondary btn-sm" type="button" data-act="nueva" aria-label="Nueva tarea (i)">${ic('plus', 14)}<span class="hide-sm">Nueva</span><span class="hide-sm">${kbd('i')}</span></button>
      <button class="icon-btn theme-btn" type="button" data-act="tema" aria-label="Cambiar a tema oscuro (t)">${ic('moon')}${ic('sun')}</button>
      <span class="level" id="level" title="Nivel ${D.usuario.nivel}">${ic('sparkles', 14)}<span class="num">Nv ${D.usuario.nivel}</span><span class="level-xp num" data-count="xpHoy">+${D.usuario.xpHoy}</span></span>
      <span class="avatar" role="img" aria-label="Tu perfil">${D.usuario.iniciales}</span>
      <button class="icon-btn hide-sm" type="button" aria-label="Mostrar el panel derecho" aria-pressed="true">${ic('panel-right')}</button>
    </div>
  </header>`

  const sidebar = () => `<aside class="side" aria-label="Navegación principal">
    <nav><ul class="side-list">${D.navegacion
      .map((n) => `<li><a href="#" class="side-item${n.activo ? ' is-active' : ''}"${n.activo ? ' aria-current="page"' : ''}>${ic(n.icon)}<span>${n.label}</span><span class="side-kbd">${n.atajo}</span></a></li>`)
      .join('')}</ul></nav>
    <div class="side-group"><h2 class="side-title">Proyectos</h2><ul class="side-list">${D.proyectos
      .map((p) => `<li><a href="#" class="side-item side-proj"><span class="dot" style="background:${p.color}"></span><span>${p.nombre}</span><span class="side-count num">${p.pendientes}</span></a></li>`)
      .join('')}</ul></div>
  </aside>`

  const dock = () => {
    const u = D.usuario
    return `<aside class="dock" aria-label="Panel derecho">
      <div class="dock-tabs" role="tablist" aria-label="Paneles">
        <button role="tab" id="dt-0" aria-controls="dp-0" aria-selected="true" class="dock-tab is-on">${ic('trophy', 14)}Progreso</button>
        <button role="tab" id="dt-1" aria-controls="dp-1" aria-selected="false" class="dock-tab" tabindex="-1">${ic('inbox', 14)}Captura</button>
        <button role="tab" id="dt-2" aria-controls="dp-2" aria-selected="false" class="dock-tab" tabindex="-1">${ic('timer', 14)}Enfoque</button>
      </div>
      <div class="dock-panels">
      <div class="dock-body" role="tabpanel" id="dp-1" aria-labelledby="dt-1" hidden>
        <label class="dock-input"><span class="sr">Apuntar algo</span>${ic('plus', 14)}<input type="text" placeholder="Apunta algo para luego" autocomplete="off"></label>
        <h3 class="h-sub">En la bandeja <span class="count num">${D.bandeja.length}</span></h3>
        <ul class="inbox">${D.bandeja.map((b) => `<li><span class="inbox-dot" aria-hidden="true"></span><span>${esc(b.texto)}</span><span class="meta">${b.cuando}</span></li>`).join('')}</ul>
        <p class="meta dock-note">Lo que apuntas aquí no entra en Hoy hasta que lo planificas.</p>
      </div>
      <div class="dock-body" role="tabpanel" id="dp-2" aria-labelledby="dt-2" hidden>
        <div class="dock-focus"><span class="dock-focus-v num">${D.kpi.foco.valor}</span><span class="meta">de 3 h de foco hoy</span>
          <div class="bar-track"><span class="bar-fill" style="width:36%"></span></div></div>
        <h3 class="h-sub">Sesiones de hoy</h3>
        <ul class="inbox">${D.sesiones.map((s) => `<li><span class="num meta">${s.hora}</span><span>${esc(s.titulo)}</span><span class="meta num">${s.dur}</span></li>`).join('')}</ul>
        <button class="btn btn-secondary btn-sm dock-go" type="button" data-act="foco">${ic('timer', 14)}Empezar foco ${kbd('f')}</button>
      </div>
      <div class="dock-body" role="tabpanel" id="dp-0" aria-labelledby="dt-0">
        ${P.xpPanel ? P.xpPanel() : `<div class="xp">
          <div class="xp-head"><span class="xp-level">Nivel ${u.nivel}</span><span class="meta num"><span data-count="xp" data-fmt="miles">${u.xp.toLocaleString('es')}</span> / ${u.xpSiguiente.toLocaleString('es')} XP</span></div>
          <div class="bar-track" role="progressbar" aria-valuemin="0" aria-valuemax="${u.xpSiguiente}" aria-valuenow="${u.xp}" aria-label="XP del nivel"><span class="bar-fill" id="xp-fill" style="width:${(u.xp / u.xpSiguiente) * 100}%"></span></div>
          <p class="meta"><span class="num" data-count="xpHoy">+${u.xpHoy}</span> XP hoy</p></div>`}
        <h3 class="h-sub">Atributos</h3>
        <ul class="attrs">${D.dock.atributos
          .map((a) => `<li><span class="attr-name">${a.nombre}</span><span class="meta num">nv ${a.nivel}</span>
          <span class="bar-track sm" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(a.progreso * 100)}" aria-label="${a.nombre}"><span class="bar-fill" style="width:${a.progreso * 100}%"></span></span></li>`)
          .join('')}</ul>
        <h3 class="h-sub">Último logro</h3>
        <div class="badge-row">${ic('award', 18)}<div><strong>${D.dock.logro.titulo}</strong><p class="meta">${D.dock.logro.detalle}</p></div></div>
      </div>
      </div>
    </aside>`
  }

  const mobnav = () => `<nav class="mobnav" aria-label="Navegación">
    ${[['layout-grid', 'Hoy', true], ['calendar-range', 'Plan'], ['list-checks', 'Hábitos'], ['list-todo', 'Tareas'], ['plus', 'Crear', false, 'nueva'], ['search', 'Buscar', false, 'paleta']]
      .map(([i, l, on, act]) => `<a href="#" class="mob-item${on ? ' is-active' : ''}"${on ? ' aria-current="page"' : ''}${act ? ` data-act="${act}"` : ''}>${ic(i, 18)}<span>${l}</span></a>`)
      .join('')}
  </nav>`

  // ------------------------------------------------------------------ Hoy
  const overdue = () => {
    const o = D.atrasadas
    return `<section class="block" aria-labelledby="t-atr">
      <div class="block-head"><h2 id="t-atr" class="h-section">Atrasadas <span class="count num" data-count="atrasadas">${o.total}</span></h2>
        <div class="block-actions"><button class="btn btn-ghost btn-sm" type="button" data-act="atr-manana">Mover todas a mañana</button><button class="btn btn-ghost btn-sm" type="button" data-act="atr-aparcar">Aparcar todas</button></div></div>
      <p class="atr-empty meta" hidden>${ic('check-check', 14)}<span>Nada atrasado.</span> <span class="atr-empty-why"></span></p>
      <ul class="rows rows-overdue">${o.visibles
        .map((t) => `<li class="row row-overdue"><span class="row-main"><span class="row-title">${esc(t.titulo)}</span>
          <span class="late">${ic('history', 12)}<span>${t.hace}</span></span></span>
          ${P.prio(t.prioridad, { label: false })}
          <button class="link-act" type="button">${ic('arrow-up-to-line', 14)}A hoy</button>
          <button class="icon-btn sm" type="button" aria-label="Más acciones">${ic('more-horizontal', 14)}</button></li>`)
        .join('')}</ul>
      <button class="more" type="button">Ver las ${o.total - o.visibles.length} restantes</button>
    </section>`
  }

  const row = (t, i, cursor) => {
    const p = proj(t.proyecto)
    return `<li class="row row-${t.estado}${cursor ? ' is-cursor' : ''}" data-i="${i}" data-estado="${t.estado}">
      <span class="row-time num">${t.hora || '—'}</span>
      <button class="status-btn" type="button" aria-label="${t.estado === 'hecha' ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${esc(t.titulo)}">${P.status(t.estado)}</button>
      <span class="row-main"><span class="row-title">${esc(t.titulo)}</span></span>
      ${P.prio(t.prioridad, { label: false })}
      <span class="row-proj hide-sm">${p ? `<span class="dot" style="background:${p.color}"></span>${p.nombre}` : ''}</span>
      <span class="row-est meta num hide-sm">${t.est || ''}</span></li>`
  }
  window.NX_ROW = row

  const planRows = () => {
    const pend = D.plan.map((t, i) => [t, i]).filter(([t]) => t.estado !== 'hecha')
    const done = D.plan.map((t, i) => [t, i]).filter(([t]) => t.estado === 'hecha')
    return `<section class="block plan" aria-labelledby="t-plan">
      <div class="block-head"><h2 id="t-plan" class="h-section">Plan de hoy</h2><span class="meta"><span class="num" data-count="hechas">${hechas}</span> de <span class="num" data-count="total">${D.plan.length}</span> hechas</span></div>
      <ul class="rows rows-plan">${pend.map(([t, i], k) => row(t, i, k === 1)).join('')}</ul>
      <h3 class="done-head h-sub">Hechas <span class="count num" data-count="hechas">${hechas}</span></h3>
      <ul class="rows rows-done">${done.map(([t, i]) => row(t, i)).join('')}</ul>
      <p class="hint meta hide-sm"><span>${kbd('x')} completar</span><span>${kbd('i')} nueva tarea</span><span>${kbd('f')} foco</span><span>${kbd('Ctrl K')} buscar</span><span>${kbd('t')} tema</span></p>
    </section>`
  }

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
        <div class="kpi"><span class="kpi-label">Tareas</span><span class="kpi-value num"><span data-count="hechas">${hechas}</span> de <span data-count="total">${D.plan.length}</span></span><span class="meta">hechas hoy</span></div>
        <div class="kpi"><span class="kpi-label">Progreso</span><span class="kpi-value num"><span data-count="xpHoy">+${D.usuario.xpHoy}</span> XP</span><span class="meta">${k.xp.detalle}</span></div>
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
    <div class="card-head"><h2 id="t-chk" class="h-section">Check-in</h2><span class="meta"><span class="num" data-count="ck">2</span> de 3</span></div>
    ${D.checkin.preguntas
      .map((q) => `<div class="ck-row"><span class="ck-label">${q.label}</span><div class="ck-scale" role="radiogroup" aria-label="${q.label}">${[1, 2, 3, 4, 5]
        .map((n) => `<button type="button" role="radio" aria-checked="${q.valor === n}" class="ck${q.valor === n ? ' is-on' : ''}${q.valor && n < q.valor ? ' is-below' : ''}"${q.valor === n || (!q.valor && n === 1) ? '' : ' tabindex="-1"'}>${n}</button>`)
        .join('')}</div>${q.valor ? '' : '<span class="ck-pending meta">Sin responder</span>'}</div>`)
      .join('')}
  </section>`

  const habits = () => `<section class="block" aria-labelledby="t-hab">
    <div class="block-head"><h2 id="t-hab" class="h-section">Hábitos de hoy</h2><button class="btn btn-ghost btn-sm" type="button">${ic('plus', 14)}Nuevo hábito</button></div>
    <ul class="habits">${D.habitos
      .map((h) => `<li class="habit"><div class="habit-top">
        <button class="habit-check${h.hechoHoy ? ' is-done' : ''}" type="button" aria-pressed="${!!h.hechoHoy}" ${h.hechoHoy === null ? 'disabled aria-disabled="true"' : ''} aria-label="${h.nombre}: ${h.hechoHoy ? 'hecho hoy' : h.hechoHoy === null ? 'descanso hoy' : 'marcar como hecho'}">${h.hechoHoy ? ic('check', 14) : h.hechoHoy === null ? ic('moon', 12) : ''}</button>
        <span class="habit-name">${h.nombre}</span><span class="meta habit-meta">${h.hechoHoy === null ? 'Descanso hoy' : h.racha}</span></div>
        <ol class="week" aria-label="Semana de ${h.nombre}">${h.semana.map((s, i) => P.habitDay(s, i)).join('')}</ol></li>`)
      .join('')}</ul>
  </section>`

  const unscheduled = () => `<button class="fold" type="button" aria-expanded="false">${ic('chevron-right', 14)}Sin planificar <span class="count num">${D.sinPlanificar}</span></button>`

  const today = () => `<div class="page">
    <header class="page-head">
      <div class="page-title"><button class="icon-btn" type="button" aria-label="Día anterior">${ic('chevron-left')}</button>
        <h1 class="h-page">${D.fecha}</h1><button class="icon-btn" type="button" aria-label="Día siguiente">${ic('chevron-right')}</button></div>
      <div class="page-actions"><span class="meta habits-count">${ic('check-check', 14)}<span><span class="num" data-count="habitos">2</span> de 4 hábitos</span></span>
        <button class="btn btn-ghost btn-sm" type="button">${ic('moon', 14)}Cerrar el día</button></div>
    </header>
    <div class="cols">
      <div class="col-main">${P.dayCard()}${P.nowBlock()}${overdue()}${planRows()}${kpis()}</div>
      <div class="col-side">${goal()}${checkin()}${habits()}${unscheduled()}</div>
    </div>
  </div>`

  // ------------------------------------------------------------------ capas
  const groups = [...new Set(D.paleta.map((p) => p.grupo))]
  const palette = () => `<div class="pal" id="pal" role="dialog" aria-modal="true" aria-label="Buscar o ejecutar" hidden>
    <div class="pal-in">${ic('search')}<input id="pal-q" type="text" placeholder="Busca una acción, una vista o una tarea" aria-label="Buscar" autocomplete="off" role="combobox" aria-controls="pal-list" aria-expanded="true"><span class="pal-esc">${kbd('Esc')}</span></div>
    <div class="pal-list" id="pal-list" role="listbox" aria-label="Resultados"><span class="pal-hl" aria-hidden="true"></span>${groups
      .map((g) => `<div class="pal-group" data-g="${g}"><p class="pal-gt">${g}</p>${D.paleta
        .map((it, i) => [it, i])
        .filter(([it]) => it.grupo === g)
        .map(([it, i]) => `<div class="pal-item" role="option" id="pal-${i}" data-i="${i}" aria-selected="false">${ic(it.icon)}<span class="pal-label">${esc(it.label)}</span>${it.atajo ? `<span class="pal-kbd">${kbd(it.atajo)}</span>` : ''}</div>`)
        .join('')}</div>`)
      .join('')}<p class="pal-empty meta" hidden>Nada coincide. Prueba con «foco» o «tema».</p></div>
    <div class="pal-foot meta"><span>${kbd('↑')}${kbd('↓')} moverse</span><span>${kbd('Enter')} ejecutar</span></div>
  </div>`

  const quickAdd = () => `<div class="qa dialog" id="qa" role="dialog" aria-modal="true" aria-label="Nueva tarea" hidden>
    <div class="qa-content">
      <div class="dialog-body">
        <input id="qa-q" class="qa-input" type="text" autocomplete="off" aria-label="Título de la tarea" placeholder="Qué tienes que hacer">
        <p class="qa-help meta">Escribe la fecha, la hora, la prioridad (p1 a p4), el #proyecto o la duración y se detectan solos.</p>
        <div class="chips" id="qa-chips" aria-live="polite"></div>
      </div>
      <footer class="dialog-foot"><button class="btn btn-ghost btn-sm" type="button" id="qa-example">${ic('wand-sparkles', 14)}Escribir un ejemplo</button>
        <span class="grow"></span><button class="btn btn-ghost" type="button" data-close="qa">Cancelar</button>
        <button class="btn btn-primary" type="button" id="qa-ok">Crear tarea ${kbd('Enter')}</button></footer>
    </div>
  </div>`

  const focus = () => `<div class="focus" id="focus" role="dialog" aria-modal="true" aria-labelledby="focus-t" hidden>${P.focusMode()}</div>`

  const mockBar = () => `<div class="mk" role="group" aria-label="Controles del mockup">
    <span class="mk-name">${esc(X.meta.nombre)}</span>
    <div class="mk-seg" role="radiogroup" aria-label="Animación">${[['full', 'Completa'], ['soft', 'Suave'], ['off', 'Sin animación']]
      .map(([v, l]) => `<button type="button" role="radio" data-motion="${v}" aria-checked="${v === 'full'}">${l}</button>`)
      .join('')}</div>
  </div>`

  // ------------------------------------------------------------------ montaje
  document.getElementById('app').innerHTML = `<div class="app">${navbar()}<div class="shell">${sidebar()}<main class="main" id="main">${today()}</main>${dock()}</div>${mobnav()}</div>
    <div class="scrim" id="scrim" hidden></div>${palette()}${quickAdd()}${focus()}
    <div class="toasts" id="toasts" aria-live="polite"></div>${mockBar()}<p id="live" class="sr" aria-live="polite"></p>`
  window.lucide.createIcons({ attrs: { 'stroke-width': X.strokeWidth || 1.75 } })
})()
