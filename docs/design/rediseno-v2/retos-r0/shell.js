// Retos R0 · shell de la app (navbar, barra lateral, panel derecho y barra móvil tal como quedaron en
// las fases 1 y 2), estado del mockup, acciones sobre los datos demo y barra de controles.
// El contenido de cada estado lo pinta base.js (común a las cuatro vistas); las vistas d/a/b/c solo
// aportan `lista(c)`. «completar» reutiliza la lista y reproduce el momento de completar.
// La vista de la lista (v) es una preferencia del usuario: se elige con el selector de la página y se
// recuerda (aquí en localStorage; en la app, ver README).
// URL: ?v=d|b|c · vista=lista|detalle|crear|vacio|completar|hoy · theme=light|dark · static=1 · bare=1
//      motion=full|off · gam=0 · id=<reto> (detalle) · primer=1 (vacío: primer día sin datos)
;(function () {
  const RT = window.RT
  const P = new URLSearchParams(location.search)
  const root = document.documentElement
  const VISTAS = ['lista', 'detalle', 'crear', 'vacio', 'completar', 'hoy']
  const NOMBRES = { lista: 'Lista', detalle: 'Detalle', crear: 'Crear reto', vacio: 'Vacío', completar: 'Completar', hoy: 'Resumen en Hoy' }
  const VARIANTES = { d: 'Mezcla', b: 'Cadena', c: 'Horizonte' }
  const STORE = 'nx-retos-vista'
  const guardada = () => {
    try {
      return localStorage.getItem(STORE)
    } catch {
      return null
    }
  }
  const st = {
    v: VARIANTES[P.get('v')] ? P.get('v') : VARIANTES[guardada()] ? guardada() : 'd',
    primer: P.get('primer') === '1',
    vista: VISTAS.includes(P.get('vista')) ? P.get('vista') : 'lista',
    theme: P.get('theme') === 'light' ? 'light' : 'dark',
    motion: P.get('motion') === 'off' ? 'off' : 'full',
    gam: P.get('gam') !== '0',
    sel: P.get('id'),
  }
  const isStatic = P.get('static') === '1'
  if (isStatic) root.classList.add('is-static')
  if (P.get('bare') === '1') root.classList.add('is-bare')
  const reduce = () => st.motion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches

  // ------------------------------------------------------------------ datos y acciones
  let M
  function fresh() {
    M = { retos: structuredClone(RT.retos), cumplidos: structuredClone(RT.cumplidos), misiones: structuredClone(RT.misiones) }
    if (st.vista === 'vacio') {
      M.retos = []
      M.cumplidos = []
    }
  }
  const find = (id) => M.retos.find((r) => r.id === id) || M.cumplidos.find((r) => r.id === id)
  const recalc = (r) => {
    const pasados = r.dias.filter((d) => d.estado !== 'futuro' && d.estado !== 'hoy')
    r.hechos = r.dias.filter((d) => d.estado === 'hecho').length
    r.cumplimiento = Math.round((r.hechos / Math.max(pasados.length, 1)) * 100)
  }
  const A = {
    // Marca el día de hoy. Devuelve { r, cumplido } o null si no había nada que marcar.
    marcar(id) {
      const r = M.retos.find((x) => x.id === id)
      const d = r && r.dias.find((x) => x.estado === 'hoy')
      if (!d) return null
      d.estado = 'hecho'
      r.hoyHecho = true
      r.racha++
      r.mejor = Math.max(r.mejor, r.racha)
      recalc(r)
      if (r.ultimoDia) {
        r.estado = 'cumplido'
        r.fin = RT.HOY
        M.retos = M.retos.filter((x) => x !== r)
        M.cumplidos.unshift(r)
        return { r, cumplido: true }
      }
      return { r, cumplido: false }
    },
    // «Hoy no»: gasta un escudo a propósito. Cubre el día (la racha sigue) pero no cuenta como hecho.
    hoyNo(id) {
      const r = M.retos.find((x) => x.id === id)
      const d = r && r.dias.find((x) => x.estado === 'hoy')
      if (!d || r.escudosLibres < 1) return null
      d.estado = 'hoyno'
      r.escudosUsados++
      r.escudosLibres--
      r.racha++
      r.mejor = Math.max(r.mejor, r.racha)
      r.hoyHecho = true
      r.hoyNoUsado = true
      recalc(r)
      return { r }
    },
    avanzarMision(id) {
      const m = M.misiones.find((x) => x.id === id)
      if (!m || m.actual >= m.meta) return null
      m.actual++
      if (m.actual >= m.meta) m.cumplidaA = RT.reloj
      return m
    },
    // Reto nuevo: empieza hoy (día 1). Lo crea el diálogo de cada variante.
    crear({ titulo, duracion, escudos }) {
      const id = `nuevo-${Date.now()}`
      const r = RT.reto({ id, titulo, nota: '', inicio: RT.HOY, duracion, escudos })
      M.retos.unshift(r)
      return r
    },
    snapshot: () => structuredClone(M),
    restore(s) {
      M = s
      render()
    },
  }

  // ------------------------------------------------------------------ ayudas de marcado
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const ic = (n, s = 16, cls = '') => `<i data-lucide="${n}" class="ic ic-${s} ${cls}" aria-hidden="true"></i>`
  const kbd = (k) => `<kbd>${esc(k)}</kbd>`
  const ESTADO_LABEL = { hoy: 'Hoy, sin marcar', pendiente: 'Pendiente', curso: 'En curso', hecho: 'Hecho' }
  function status(estado, size = 16) {
    const inner =
      estado === 'hecho'
        ? '<circle cx="8" cy="8" r="7" class="st-fill"/><path d="M4.8 8.2l2.1 2.1 4.3-4.5" class="st-check"/>'
        : estado === 'curso'
          ? '<circle cx="8" cy="8" r="6.25" class="st-ring"/><path d="M8 3.2a4.8 4.8 0 0 1 0 9.6z" class="st-half"/>'
          : '<circle cx="8" cy="8" r="6.25" class="st-ring"/>'
    return `<svg class="status status-${estado}" viewBox="0 0 16 16" width="${size}" height="${size}" role="img" aria-label="${ESTADO_LABEL[estado]}">${inner}</svg>`
  }
  // Escudos con forma, no solo color: libre = escudo entero, gastado = escudo tachado.
  function escudos(r, { texto = false } = {}) {
    if (!r.escudos) return `<span class="shields faint">${texto ? 'Sin escudos' : '—'}</span>`
    const libres = Array.from({ length: r.escudosLibres }, () => ic('shield', 14, 'sh-free')).join('')
    const usados = Array.from({ length: r.escudosUsados }, () => ic('shield-off', 14, 'sh-used')).join('')
    return `<span class="shields" role="img" aria-label="${r.escudosLibres} de ${r.escudos} escudos libres">${libres}${usados}${
      texto ? `<span class="shields-txt">${r.escudosLibres} de ${r.escudos} libres</span>` : ''
    }</span>`
  }
  const xp = (n) => `<span class="xp">+${n} XP</span>`
  const meter = (p, label) => `<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p)}"${label ? ` aria-label="${esc(label)}"` : ''}><span style="width:${Math.max(0, Math.min(100, p))}%"></span></div>`
  const DIA_LABEL = { hecho: 'Hecho', escudo: 'Cubierto por un escudo', hoyno: '«Hoy no», con escudo', fallo: 'Fallado, sin escudos', hoy: 'Hoy, sin marcar', futuro: 'Por llegar' }
  const misionEstado = (m) => (m.actual >= m.meta ? 'hecho' : m.actual > 0 ? 'curso' : 'pendiente')
  const misionProgreso = (m) => (m.meta === 1 ? (m.actual ? 'Hecho' : 'Sin hacer') : `${m.actual} de ${m.meta}${m.unidad === 'min' ? ' min' : ''}`)
  const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`
  const racha = (r) => `<span class="racha" title="Racha actual: ${dias(r.racha)}">${ic('flame', 14)}<span class="num">${r.racha}</span></span>`
  const H = { esc, ic, kbd, status, escudos, xp, meter, DIA_LABEL, misionEstado, misionProgreso, dias, racha }

  // ------------------------------------------------------------------ shell
  const LINMARK = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><clipPath id="lm"><rect width="16" height="16" rx="4"/></clipPath><g clip-path="url(#lm)"><path d="M0 0H16L0 16Z" fill="var(--nx-accent)"/><path d="M16 0V16H0Z" fill="var(--nx-text)"/></g></svg>`
  const NAV = [
    ['Hoy', 'layout-grid', 'h', 'hoy'],
    ['Planificación', 'calendar-range', 'p'],
    ['Hábitos', 'list-checks', 'b'],
    ['Retos', 'flag', 'e', 'retos'],
    ['Rutinas', 'repeat', 'u'],
    ['Estadísticas', 'chart-column', 's'],
    ['Tareas', 'list-todo', 't'],
    ['Proyectos', 'folder-kanban', 'r'],
    ['Plugins', 'puzzle', 'x'],
    ['Ajustes', 'settings', 'a'],
  ]
  const activo = () => (st.vista === 'hoy' ? 'hoy' : 'retos')

  const mockbar = () => `<div class="mockbar" role="toolbar" aria-label="Controles del mockup">
    <b>Retos R0</b>
    <span class="mk-note" title="El selector está en la propia página y la vista se recuerda (localStorage)">Vista actual: <b>${VARIANTES[st.v]}</b> · cámbiala con el selector de la página</span>
    <select id="mk-vista" aria-label="Estado">${VISTAS.map((v) => `<option value="${v}"${v === st.vista ? ' selected' : ''}>${NOMBRES[v]}</option>`).join('')}</select>
    ${st.vista === 'vacio' ? `<div class="grp"><button type="button" data-mk-primer="0" aria-pressed="${!st.primer}">Con misiones</button><button type="button" data-mk-primer="1" aria-pressed="${st.primer}">Primer día sin datos</button></div>` : ''}
    <div class="grp"><button type="button" data-mk-theme="light" aria-pressed="${st.theme === 'light'}">Claro</button><button type="button" data-mk-theme="dark" aria-pressed="${st.theme === 'dark'}">Oscuro</button></div>
    <div class="grp"><button type="button" data-mk-motion="full" aria-pressed="${st.motion === 'full'}">Movimiento</button><button type="button" data-mk-motion="off" aria-pressed="${st.motion === 'off'}">Reducido</button></div>
    <div class="grp"><button type="button" data-mk-gam="1" aria-pressed="${st.gam}">Con XP</button><button type="button" data-mk-gam="0" aria-pressed="${!st.gam}">Sin gamificación</button></div>
    <button type="button" class="sim" id="mk-sim" title="En la app, la misión avanza sola al completar una tarea en Hoy">Simular: tarea hecha en Hoy</button>
    <button type="button" class="sim" id="mk-replay">Repetir «completar»</button>
  </div>`

  const navbar = () => `<header class="nav">
    <button class="icon-btn hide-sm" type="button" aria-label="Colapsar navegación">${ic('panel-left-close')}</button>
    <div class="brand">${LINMARK}<span class="brand-name">Nextuss</span></div>
    <div class="crumb">${ic('chevron-right', 14)}<span>${activo() === 'hoy' ? 'Hoy' : 'Retos'}</span></div>
    <button class="search" type="button">${ic('search', 14)}<span>Buscar o ejecutar un comando…</span>${kbd('Ctrl K')}</button>
    <div class="nav-right">
      <button class="btn btn-secondary" type="button" aria-label="Nuevo">${ic('plus', 14)}<span class="hide-sm">Nuevo</span>${kbd('n')}</button>
      <span class="level hide-sm" data-gam>Nv. ${RT.usuario.nivel}</span>
      <span class="avatar" role="img" aria-label="Tu perfil">${ic('user', 15)}</span>
      <button class="icon-btn hide-sm" type="button" aria-label="Ocultar panel lateral">${ic('panel-right-open', 16, 'accent-text')}</button>
    </div>
  </header>`

  const sidebar = () => `<nav class="side" aria-label="Navegación principal">${NAV.map(([l, i, g, k]) => {
    const on = k && k === activo()
    return `<a href="#" class="side-item${on ? ' is-active' : ''}"${on ? ' aria-current="page"' : ''}>${ic(i, 15)}<span>${l}</span>${
      k === 'retos' && !on ? '<span class="side-new">Nuevo</span>' : `<span class="go">g ${g}</span>`
    }</a>`
  }).join('')}</nav>`

  const dock = () => {
    const u = RT.usuario
    const C = 2 * Math.PI * 21
    const body = st.gam
      ? `<div class="lvl"><div class="lvl-ring"><svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true"><circle cx="24" cy="24" r="21" fill="none" stroke="var(--nx-border)" stroke-width="3"/><circle cx="24" cy="24" r="21" fill="none" stroke="var(--nx-accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - u.xp / u.xpNivel)}" transform="rotate(-90 24 24)"/></svg><b class="num">${u.nivel}</b></div>
        <div class="lvl-meta"><small>Nivel</small><b class="num">${u.xp}</b> <span class="muted num">/ ${u.xpNivel} XP</span></div>
        <span class="chip-shield" title="Escudos de racha de hábitos este mes">${ic('shield', 12)}<span class="num">${u.escudosMes}</span></span></div>
        <div class="attrs">${[['heart-pulse', 'Salud', 22, 9], ['brain', 'Mente', 18, 14], ['briefcase', 'Trabajo', 4, 5], ['users', 'Relaciones', 50, 4]]
          .map(([i, n, p, l]) => `<div class="attr">${ic(i, 14)}<span>${n}</span>${meter(p, n)}<span class="num">Nv. ${l}</span></div>`)
          .join('')}</div>`
      : `<p class="muted" style="font-size:var(--text-ui)">Captura rápida: nada pendiente.</p>`
    return `<aside class="dock" aria-label="Panel">
      <div class="dock-head">PANEL</div>
      <div class="dock-tabs">${['gauge', 'calendar', 'activity', 'notebook-pen', 'timer', 'sparkles'].map((i, n) => `<span class="dock-tab${n === 0 ? ' is-on' : ''}">${ic(i, 15)}</span>`).join('')}</div>
      <div class="dock-body">${body}</div>
    </aside>`
  }

  const mnav = () => `<nav class="mnav" aria-label="Navegación">${[
    ['Hoy', 'layout-grid', 'hoy'],
    ['Planificación', 'calendar-range'],
    ['Hábitos', 'list-checks'],
    ['Tareas', 'list-todo'],
  ]
    .map(([l, i, k]) => {
      const on = k === activo()
      return `<a href="#"${on ? ' aria-current="page" style="color:var(--nx-accent-text)"' : ''}>${on ? '<span class="mnav-pill" aria-hidden="true"></span>' : ''}${ic(i, 18)}<span>${l}</span></a>`
    })
    .join('')}<button type="button">${ic('plus', 18)}<span>Crear</span></button><button type="button">${ic('layout-panel-top', 18)}<span>Panel</span></button></nav>`

  // Hoy simplificado de la integración, con huecos para el resumen de cada variante.
  function hoyPage({ side = '', numerosExtra = '', antesDeNumeros = '' }) {
    const n = RT.hoyNumeros
    const max = Math.max(...n.barras.map((b) => b.m), 1)
    const u = RT.usuario
    return `<div class="hoy">
      <div class="hoy-head"><button class="icon-btn" type="button" aria-label="Día anterior">${ic('chevron-left')}</button><h1 class="h-page">${RT.hoyLargo}</h1><button class="icon-btn" type="button" aria-label="Día siguiente">${ic('chevron-right')}</button>
        <span class="hoy-head-meta">${ic('check-check', 14)}2 de 4 hábitos</span><span class="hoy-head-meta hide-sm">${ic('moon', 14)}Cerrar el día</span></div>
      <div class="hoy-grid">
        <div class="hoy-main">
          <section class="card now"><div class="now-head">${status('curso')}<span class="now-k">Ahora</span><span class="mono faint now-left">quedan 40 min</span></div>
            <p class="now-title">Revisar el presupuesto del trimestre</p>
            <div class="now-line"><span style="width:55%"></span></div>
            <div class="now-ends mono faint"><span>16:00</span><span>17:00</span></div>
            <div class="now-actions"><button class="btn btn-primary" type="button">${ic('play', 14)}Empezar foco</button><button class="btn btn-secondary" type="button">${ic('check', 14)}Hecha</button><button class="btn btn-ghost hide-sm" type="button">${ic('calendar-arrow-up', 14)}Pasar a mañana</button></div>
          </section>
          ${antesDeNumeros}
          <section aria-labelledby="t-num"><h2 id="t-num" class="h-section" style="margin-bottom:10px">Tu día en números</h2>
            <div class="numeros${st.gam ? '' : ' sin-gam'}">
              <div class="cell cell-foco"><span class="c-label">Foco</span><span class="c-value">1 h 25 min</span><span class="c-meta">${n.focoMedia}</span>
                <ol class="bars" aria-label="Minutos de foco de los últimos 7 días">${n.barras
                  .map((b) => `<li aria-label="${b.hoy ? 'Hoy' : b.l}: ${b.m} min">${b.hoy ? `<span class="bar-v num">${b.m}</span>` : ''}<span class="bar${b.hoy ? ' is-hoy' : ''}" style="height:${Math.max(b.m / max, 0.04) * 32}px"></span><span class="bar-l">${b.l}</span></li>`)
                  .join('')}</ol></div>
              <div class="cell"><span class="c-label">Tareas</span><span class="c-value">${n.tareas[0]} <span class="muted">de</span> ${n.tareas[1]}</span><span class="c-meta">hechas hoy</span></div>
              <div class="cell" data-gam><span class="c-label">Progreso</span><span class="c-value">+${u.xpHoy} XP</span><span class="c-meta">quedan ${u.xpNivel - u.xp} para el nivel ${u.nivel + 1}</span></div>
              ${numerosExtra}
            </div>
          </section>
        </div>
        <div class="hoy-side">
          ${side}
          <section class="card hoy-mini"><span class="h-section">Check-in</span><span class="faint" style="margin-left:auto;font-size:var(--text-xs)">Sin hacer</span>${ic('chevron-right', 14, 'faint')}</section>
          <section class="hoy-habits"><div class="hoy-side-h"><span class="h-section">Hábitos de hoy</span><span class="link">${ic('plus', 14)}Nuevo hábito</span></div>
            <div class="card hoy-mini">${ic('brain', 16, 'faint')}<span>Meditar</span><span class="faint num" style="font-size:var(--text-xs)">${ic('flame', 12)} 12</span><span class="habit-box" aria-hidden="true"></span></div>
          </section>
        </div>
      </div>
    </div>`
  }

  // ------------------------------------------------------------------ capas vivas
  function celebrate(el) {
    if (isStatic || !el) return Promise.resolve()
    return window.RT_celebrate(el, { reduce: reduce() })
  }
  function fadeIn(el) {
    if (isStatic || !el || !window.Motion) return
    window.Motion.animate(el, { opacity: [0, 1] }, { duration: reduce() ? 0.12 : 0.18, ease: [0.2, 0.8, 0.2, 1] })
  }
  let toastTimer
  function toast(html, { undo } = {}) {
    const slot = document.getElementById('toast-slot')
    slot.innerHTML = `<div class="toast" role="status">${html}${undo ? '<button type="button" data-undo>Deshacer</button>' : ''}</div>`
    const t = slot.firstElementChild
    window.lucide?.createIcons()
    if (undo) t.querySelector('[data-undo]').addEventListener('click', () => {
      slot.innerHTML = ''
      undo()
    })
    if (!isStatic && window.Motion) {
      window.Motion.animate(t, reduce() ? { opacity: [0, 1] } : { opacity: [0, 1], y: [16, 0], scale: [0.96, 1] }, reduce() ? { duration: 0.12 } : { type: 'spring', stiffness: 900, damping: 34 })
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        if (t.isConnected) window.Motion.animate(t, { opacity: 0 }, { duration: 0.2, ease: [0.4, 0, 1, 1] }).then(() => t.remove())
      }, 5000)
    }
  }

  // Marcar el día con su celebración y su aviso, igual en las tres variantes.
  function marcarConCelebracion(id) {
    const antes = A.snapshot()
    const res = A.marcar(id)
    if (!res) return
    render()
    // [data-cel] marca el sitio visible donde celebrar (la ficha o la página de detalle); si no, la fila.
    const el = document.querySelector(`[data-cel="${id}"]`) || document.querySelector(`[data-reto="${id}"]`)
    celebrate(el)
    if (res.cumplido)
      toast(`${ic('flag', 14)}<span>Reto cumplido: <b>${esc(res.r.titulo)}</b>, ${dias(res.r.duracion)}</span><span class="xp" data-gam style="color:inherit;opacity:.75">+${res.r.xpFinal} XP</span>`, { undo: () => A.restore(antes) })
    else toast(`<span>Día ${res.r.diaActual} marcado. Racha de ${dias(res.r.racha)}</span><span class="xp" data-gam style="color:inherit;opacity:.75">+${res.r.xpDia} XP</span>`, { undo: () => A.restore(antes) })
  }
  function hoyNoConAviso(id) {
    const antes = A.snapshot()
    const res = A.hoyNo(id)
    if (!res) return
    render()
    fadeIn(document.querySelector(`[data-reto="${id}"]`))
    toast(`${ic('shield-off', 14)}<span>Hoy no: gastas 1 escudo y la racha sigue</span>`, { undo: () => A.restore(antes) })
  }
  // La misión se cumple fuera de /retos (al completar una tarea en Hoy): aquí solo se actualiza, sin celebración.
  function simularTarea() {
    const m = A.avanzarMision('m-tareas')
    if (!m) return
    render()
    fadeIn(document.querySelector('[data-mision="m-tareas"]'))
  }

  // ------------------------------------------------------------------ render y navegación
  let keyHandler = null
  const ctx = {
    st,
    RT,
    H,
    A,
    get B() {
      return window.RT_BASE
    },
    get M() {
      return M
    },
    nav,
    setView,
    celebrate,
    fadeIn,
    toast,
    marcar: marcarConCelebracion,
    hoyNo: hoyNoConAviso,
    hoyPage,
    isStatic,
    reduce,
    find,
    mobile: () => innerWidth < 768,
    keys: (fn) => (keyHandler = fn),
    rerender: () => render(),
  }

  function render() {
    root.dataset.theme = st.theme
    root.classList.toggle('gam-off', !st.gam)
    const B = window.RT_BASE
    keyHandler = null
    const vista = st.vista === 'completar' ? 'lista' : st.vista
    const out = B[vista](ctx)
    const prevFocus = document.activeElement?.dataset?.focusKey
    document.getElementById('app').innerHTML =
      mockbar() +
      navbar() +
      `<div class="frame">${sidebar()}<main class="main" id="main" data-v="${st.v}" data-vista="${st.vista}">${out.main}</main>${dock()}</div>` +
      mnav() +
      (out.overlay || '') +
      '<div id="toast-slot"></div>'
    window.lucide?.createIcons()
    wireMockbar()
    wireCommon()
    B.mount(ctx)
    const auto = document.querySelector('[data-autofocus]')
    if (auto && !isStatic) auto.focus({ preventScroll: true })
    else if (prevFocus) document.querySelector(`[data-focus-key="${prevFocus}"]`)?.focus({ preventScroll: true })
  }

  function syncUrl() {
    const q = new URLSearchParams(location.search)
    q.set('v', st.v)
    q.set('vista', st.vista)
    q.set('theme', st.theme)
    st.motion === 'off' ? q.set('motion', 'off') : q.delete('motion')
    st.gam ? q.delete('gam') : q.set('gam', '0')
    st.vista === 'detalle' ? q.set('id', st.sel || 'leer') : q.delete('id')
    st.primer ? q.set('primer', '1') : q.delete('primer')
    history.replaceState(null, '', `?${q}`)
  }

  // Cambia la vista de la lista con los MISMOS datos (sin reiniciar la demo) y la recuerda.
  function setView(k) {
    if (!window.RT_V[k] || k === st.v) return
    st.v = k
    try {
      localStorage.setItem(STORE, k)
    } catch {}
    syncUrl()
    render()
    fadeIn(document.querySelector('.r-area'))
    document.querySelector(`[data-view="${k}"]`)?.focus({ preventScroll: true })
  }

  // Cambia de estado. `reset` vuelve a los datos demo (desde el selector de estado del mockup).
  function nav(vista, extra = {}, { reset = false } = {}) {
    st.anim = (vista === 'detalle' || vista === 'crear') && st.vista !== vista
    Object.assign(st, { vista }, extra)
    if (reset || vista === 'vacio' || vista === 'completar') fresh()
    syncUrl()
    render()
    if (vista === 'completar') playCompletar()
  }

  // El momento de completar: marcar un día, una misión que se cumple y un reto entero cumplido.
  function finalCompletar() {
    A.marcar('pantallas')
    A.avanzarMision('m-tareas')
    const res = A.marcar('leer')
    render()
    toast(`${ic('flag', 14)}<span>Reto cumplido: <b>${esc(res.r.titulo)}</b>, ${dias(res.r.duracion)}</span><span class="xp" data-gam style="color:inherit;opacity:.75">+${res.r.xpFinal} XP</span>`, { undo: () => {} })
  }
  let playing = 0
  async function playCompletar() {
    const run = ++playing
    if (isStatic) return finalCompletar()
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    await wait(900)
    if (run !== playing) return
    marcarConCelebracion('pantallas')
    await wait(1900)
    if (run !== playing) return
    simularTarea()
    await wait(1600)
    if (run !== playing) return
    marcarConCelebracion('leer')
  }

  // Acciones comunes por atributo, iguales en las cuatro vistas.
  function wireCommon() {
    const on = (sel, fn) => document.querySelectorAll(sel).forEach((el) => el.addEventListener('click', (e) => fn(el, e)))
    on('[data-marcar]', (el) => marcarConCelebracion(el.dataset.marcar))
    on('[data-hoyno]', (el) => hoyNoConAviso(el.dataset.hoyno))
    on('[data-open]', (el, e) => {
      e.preventDefault()
      st.volverA = st.vista === 'detalle' ? st.volverA : st.vista === 'completar' ? 'lista' : st.vista
      nav('detalle', { sel: el.dataset.open })
    })
    on('[data-new]', () => {
      st.volverA = st.vista === 'vacio' ? 'vacio' : 'lista'
      st.prefill = null
      nav('crear')
    })
    on('[data-plantilla]', (el) => {
      st.volverA = st.vista
      st.prefill = RT.plantillas[Number(el.dataset.plantilla)]
      nav('crear')
    })
    on('[data-close]', () => {
      const back = st.volverA || 'lista'
      st.volverA = null
      nav(back)
    })
  }

  function wireMockbar() {
    document.querySelectorAll('[data-mk-primer]').forEach((b) => b.addEventListener('click', () => nav(st.vista, { primer: b.dataset.mkPrimer === '1' })))
    document.getElementById('mk-vista').addEventListener('change', (e) => nav(e.target.value, {}, { reset: true }))
    document.querySelectorAll('[data-mk-theme]').forEach((b) => b.addEventListener('click', () => nav(st.vista, { theme: b.dataset.mkTheme })))
    document.querySelectorAll('[data-mk-motion]').forEach((b) => b.addEventListener('click', () => nav(st.vista, { motion: b.dataset.mkMotion })))
    document.querySelectorAll('[data-mk-gam]').forEach((b) => b.addEventListener('click', () => nav(st.vista, { gam: b.dataset.mkGam === '1' })))
    document.getElementById('mk-sim').addEventListener('click', simularTarea)
    document.getElementById('mk-replay').addEventListener('click', () => nav('completar', {}, { reset: true }))
  }

  addEventListener('keydown', (e) => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]')
    if (e.key === 'Escape' && (st.vista === 'detalle' || st.vista === 'crear')) {
      e.preventDefault()
      const back = st.volverA || 'lista'
      st.volverA = null
      nav(back)
      document.querySelector(`[data-reto="${st.sel}"] [data-open], [data-open="${st.sel}"]`)?.focus()
      return
    }
    if (keyHandler) keyHandler(e, { typing })
  })

  window.RT_V = window.RT_V || {}
  addEventListener('DOMContentLoaded', () => {
    fresh()
    render()
    if (st.vista === 'completar') playCompletar()
  })
})()
