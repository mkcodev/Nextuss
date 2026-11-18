// Ronda 2: motor de interacciones compartido. Usa motion@14 vanilla (el mismo motor que framer-motion
// en la app), así lo que se vea aquí pasa casi tal cual a motion/react en la fase 1.
// Pasada 1: completar, modo foco, paleta Ctrl K, captura rápida y tema (+ entrada de página).
// Cada dirección pone su carácter con NX_DIR.motion (muelles, curvas) y piezas firma opcionales:
//   enter(fx) · celebrate(row, fx, {done}) · statusMorph(btn, from, to, fx) · fly(fromEl, toEl, text, fx)
//   ticker(el, from, to, fx) · focusEnter(now, layer, fx) · focusExit(now, layer, fx)
//   timerRender(el, text, fx) · themeKeyframes({x, y, r}) · themeDuration · inserted(row, fx)
// Sin bucles ambientales: todo responde a una acción, salvo el temporizador del foco (tiempo real).
;(function () {
  const M = window.Motion
  const D = window.NX_DATOS
  const X = window.NX_DIR || {}
  const P = window.NX_P
  const root = document.documentElement
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const params = new URLSearchParams(location.search)
  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)')
  let level = ['full', 'soft', 'off'].includes(params.get('motion')) ? params.get('motion') : 'full'
  const lv = () => (root.classList.contains('is-static') ? 'none' : reducedMq.matches || level === 'off' ? 'off' : level)

  // ------------------------------------------------------------------ presets
  const SP = Object.assign(
    {
      ui: { type: 'spring', stiffness: 520, damping: 40 }, // abrir/cerrar capas, recolocar
      pop: { type: 'spring', stiffness: 700, damping: 24 }, // marcas, chips
      soft: { type: 'spring', stiffness: 260, damping: 32 }, // entradas grandes
      ease: [0.22, 1, 0.36, 1],
      out: [0.4, 0, 1, 1],
    },
    X.motion || {},
  )
  const soften = (o) => {
    if (o.type === 'spring') {
      const k = (o.stiffness || 300) * 0.8
      return { ...o, stiffness: k, damping: 2 * Math.sqrt(k) } // amortiguado crítico: sin rebote
    }
    return { ...o, duration: (o.duration ?? 0.3) * 0.75, delay: o.delay }
  }
  const last = (v) => (Array.isArray(v) ? v[v.length - 1] : v)

  // animate() que entiende el nivel de animación: completa, suave, sin animación (solo opacidad) o estática.
  function A(el, kf, o = {}) {
    if (!el || (el.length !== undefined && !el.length)) return Promise.resolve()
    const l = lv()
    if (l === 'none' || l === 'off') {
      const fin = {}
      for (const k in kf) if (k !== 'opacity') fin[k] = last(kf[k])
      const jumps = Object.keys(fin).length ? M.animate(el, fin, { duration: 0 }).finished : Promise.resolve()
      if ('opacity' in kf && l === 'off') return Promise.all([jumps, M.animate(el, { opacity: kf.opacity }, { duration: 0.14 }).finished])
      if ('opacity' in kf) M.animate(el, { opacity: last(kf.opacity) }, { duration: 0 })
      return jumps
    }
    return M.animate(el, kf, l === 'soft' ? soften(o) : o).finished
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, lv() === 'full' ? ms : lv() === 'soft' ? ms * 0.7 : 0))

  // FLIP: mide, cambia el DOM y anima cada elemento desde donde estaba.
  function flip(els, mutate, o = SP.ui) {
    const first = new Map(els.map((e) => [e, e.getBoundingClientRect()]))
    mutate()
    return Promise.all(
      els.map((e) => {
        const f = first.get(e)
        const l = e.getBoundingClientRect()
        const dx = f.left - l.left
        const dy = f.top - l.top
        return dx || dy ? A(e, { x: [dx, 0], y: [dy, 0] }, o) : null
      }),
    )
  }

  // Contadores: por defecto, cuenta rápida; Plano lo sustituye por un rodillo mecánico.
  const fmt = (el, n) => (el.dataset.fmt === 'miles' ? n.toLocaleString('es') : el.textContent.trim().startsWith('+') ? `+${n}` : String(n))
  const state = { hechas: D.plan.filter((t) => t.estado === 'hecha').length, total: D.plan.length, xpHoy: D.usuario.xpHoy, xp: D.usuario.xp }
  function setCount(key, to) {
    const from = state[key]
    state[key] = to
    $$(`[data-count="${key}"]`).forEach((el) => {
      if (X.ticker && lv() !== 'off' && lv() !== 'none') return X.ticker(el, from, to, fx)
      if (lv() === 'off' || lv() === 'none') return (el.textContent = fmt(el, to))
      M.animate(from, to, { duration: 0.5, ease: SP.ease, onUpdate: (v) => (el.textContent = fmt(el, Math.round(v))) })
      A(el, { y: [from < to ? -6 : 6, 0], opacity: [0.3, 1] }, SP.pop)
    })
  }

  // Aviso efímero (toast). action = { label, fn }: botón como «Deshacer»; el aviso dura más.
  function toast(text, icon = 'check', action) {
    const host = $('#toasts')
    const t = document.createElement('div')
    t.className = `toast${action ? ' has-action' : ''}`
    t.innerHTML = `<i data-lucide="${icon}" class="ic ic-14" aria-hidden="true"></i><span>${text}</span>${action ? `<button type="button" class="toast-act">${action.label}</button>` : ''}`
    host.append(t)
    icons()
    A(t, { opacity: [0, 1], y: [16, 0], scale: [0.96, 1] }, SP.pop)
    const bye = () => A(t, { opacity: 0, y: 8 }, { duration: 0.2, ease: SP.out }).then(() => t.remove())
    const timer = setTimeout(bye, action ? 4500 : 2600)
    if (action)
      t.querySelector('.toast-act').addEventListener('click', () => {
        clearTimeout(timer)
        bye()
        action.fn()
      })
  }

  // Chip de XP que vuela del sitio de la acción al nivel de la barra superior.
  function fly(fromEl, toEl, text) {
    if (!toEl || !toEl.offsetParent || lv() === 'off' || lv() === 'none') return Promise.resolve()
    if (X.fly) return X.fly(fromEl, toEl, text, fx)
    const a = fromEl.getBoundingClientRect()
    const b = toEl.getBoundingClientRect()
    const c = document.createElement('span')
    c.className = 'xp-fly num'
    c.textContent = text
    c.style.left = `${a.left + a.width / 2}px`
    c.style.top = `${a.top + a.height / 2}px`
    document.body.append(c)
    const dx = b.left + b.width / 2 - (a.left + a.width / 2)
    const dy = b.top + b.height / 2 - (a.top + a.height / 2)
    return A(c, { x: [0, dx * 0.35, dx], y: [0, dy * 0.2 - 60, dy], scale: [0.6, 1.1, 0.5], opacity: [0, 1, 0] }, { duration: lv() === 'soft' ? 0.6 : 0.85, ease: [0.5, 0, 0.3, 1] }).then(() => {
      c.remove()
      A(toEl, { scale: [1, 1.12, 1] }, { duration: 0.35, ease: SP.ease })
    })
  }

  const icons = () => window.lucide.createIcons({ attrs: { 'stroke-width': X.strokeWidth || 1.75 } })
  const live = (t) => ($('#live').textContent = t)
  const fx = { M, A, SP, lv, flip, wait, toast, fly, icons, $, $$, P, D }
  window.NX_FX = fx

  // ------------------------------------------------------------------ 1. completar
  function statusMorph(btn, from, to) {
    if (X.statusMorph) return X.statusMorph(btn, from, to, fx)
    btn.innerHTML = P.status(to)
    const svg = btn.firstElementChild
    if (to === 'hecha') {
      A($('.st-fill', svg) || svg, { scale: [0.4, 1] }, SP.pop)
      const ck = $('.st-check', svg)
      if (ck) A(ck, { strokeDashoffset: [1, 0] }, { duration: 0.32, delay: 0.08, ease: SP.ease })
    } else A(svg, { scale: [0.7, 1], opacity: [0.4, 1] }, SP.pop)
  }

  let busy = false
  async function complete(row) {
    if (!row || busy) return
    busy = true
    const done = row.dataset.estado !== 'hecha'
    const from = row.dataset.estado
    const to = done ? 'hecha' : row.dataset.prev || 'pendiente'
    if (done) row.dataset.prev = from
    row.dataset.estado = to
    row.classList.remove('row-pendiente', 'row-en-curso', 'row-hecha')
    row.classList.add(`row-${to}`)
    const btn = $('.status-btn', row)
    const title = $('.row-title', row).textContent
    btn.setAttribute('aria-label', `${done ? 'Marcar como pendiente' : 'Marcar como hecha'}: ${title}`)
    statusMorph(btn, from, to)
    const t = $('.row-title', row)
    if (done) A(t, { backgroundSize: ['0% var(--strike, 1px)', '100% var(--strike, 1px)'] }, { duration: 0.36, ease: SP.ease })
    live(done ? `Hecha: ${title}` : `Pendiente otra vez: ${title}`)
    if (done) {
      if (X.celebrate) X.celebrate(row, fx, { done })
      fly(btn, $('#level'), '+10 XP')
      setCount('xpHoy', state.xpHoy + 10)
      setCount('xp', state.xp + 10)
      const fill = $('#xp-fill')
      if (fill) A(fill, { width: `${((state.xp + 10) / D.usuario.xpSiguiente) * 100}%` }, SP.soft)
    } else {
      setCount('xpHoy', state.xpHoy - 10)
      setCount('xp', state.xp - 10)
    }
    setCount('hechas', state.hechas + (done ? 1 : -1))
    await wait(done ? 420 : 120)
    // Recolocar: la hecha baja al grupo «Hechas»; al deshacer, vuelve a su sitio por hora.
    const pend = $('.rows-plan')
    const dl = $('.rows-done')
    const all = [...$$('.row', pend), ...$$('.row', dl), $('.done-head')]
    const wasCursor = row.classList.contains('is-cursor')
    await flip(all, () => {
      if (done) {
        dl.prepend(row)
        if (wasCursor) {
          row.classList.remove('is-cursor')
          const next = $('.row', pend)
          if (next) next.classList.add('is-cursor')
        }
      } else {
        const i = +row.dataset.i
        const after = $$('.row', pend).find((r) => +r.dataset.i > i)
        after ? pend.insertBefore(row, after) : pend.append(row)
      }
    })
    busy = false
    document.dispatchEvent(new CustomEvent('nx:plan'))
  }

  // ------------------------------------------------------------------ capas: apertura, cierre, foco
  const scrim = $('#scrim')
  let top = null // capa abierta: 'pal' | 'qa' | 'focus'
  let opener = null
  function showScrim(on) {
    if (on) {
      scrim.hidden = false
      return A(scrim, { opacity: [0, 1] }, { duration: 0.22, ease: SP.ease })
    }
    return A(scrim, { opacity: 0 }, { duration: 0.18, ease: SP.out }).then(() => (scrim.hidden = true))
  }
  function close() {
    if (top === 'pal') return closePalette()
    if (top === 'qa') return closeQuick()
    if (top === 'focus') return exitFocus()
  }

  // ------------------------------------------------------------------ 3. paleta Ctrl K
  const pal = $('#pal')
  const q = $('#pal-q')
  const hl = $('.pal-hl', pal)
  let active = 0
  const visibleItems = () => $$('.pal-item', pal).filter((i) => !i.hidden)
  function moveHl(i, instant) {
    const items = visibleItems()
    if (!items.length) return (hl.style.opacity = 0)
    active = (i + items.length) % items.length
    items.forEach((it, k) => it.setAttribute('aria-selected', k === active))
    const it = items[active]
    q.setAttribute('aria-activedescendant', it.id)
    const top = it.offsetTop
    hl.style.opacity = 1
    if (instant) A(hl, { y: top, height: `${it.offsetHeight}px` }, { duration: 0 })
    else A(hl, { y: top, height: `${it.offsetHeight}px` }, SP.ui)
    it.scrollIntoView({ block: 'nearest' })
  }
  function filter() {
    const v = q.value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    const appear = []
    $$('.pal-item', pal).forEach((it) => {
      const txt = it.textContent.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      const show = !v || txt.includes(v)
      if (show && it.hidden) appear.push(it)
      it.hidden = !show
    })
    $$('.pal-group', pal).forEach((g) => (g.hidden = !$$('.pal-item', g).some((i) => !i.hidden)))
    $('.pal-empty', pal).hidden = visibleItems().length > 0
    A(appear, { opacity: [0, 1], x: [-6, 0] }, { ...SP.ui, delay: M.stagger(0.02) })
    moveHl(0)
  }
  async function openPalette() {
    if (top) await close()
    top = 'pal'
    opener = document.activeElement
    q.value = ''
    filter()
    pal.hidden = false
    showScrim(true)
    q.focus()
    moveHl(0, true)
    A(pal, { opacity: [0, 1], scale: [0.94, 1], y: [-12, 0], filter: ['blur(6px)', 'blur(0px)'] }, SP.ui)
    A($$('.pal-gt, .pal-item', pal), { opacity: [0, 1], y: [6, 0] }, { ...SP.ui, delay: M.stagger(0.018, { startDelay: 0.04 }) })
    if (X.paletteOpened && lv() !== 'off' && lv() !== 'none') X.paletteOpened(pal, fx)
  }
  async function closePalette(keepScrim) {
    top = null
    if (!keepScrim) showScrim(false)
    await A(pal, { opacity: 0, scale: 0.97, y: -6 }, { duration: 0.16, ease: SP.out })
    pal.hidden = true
    if (!keepScrim && opener) opener.focus?.()
  }
  async function runPalette(i) {
    const it = D.paleta[+visibleItems()[i]?.dataset.i]
    if (!it) return
    const node = visibleItems()[i]
    A(node, { scale: [1, 0.98, 1] }, { duration: 0.18 })
    await closePalette(it.accion === 'nueva')
    if (it.accion === 'nueva') return openQuick($('.search'))
    if (it.accion === 'foco') return enterFocus()
    if (it.accion === 'tema') return toggleTheme($('.theme-btn'))
    if (it.accion.startsWith('toast:')) toast(it.accion.slice(6), it.icon)
  }
  q.addEventListener('input', filter)
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), moveHl(active + 1))
    if (e.key === 'ArrowUp') (e.preventDefault(), moveHl(active - 1))
    if (e.key === 'Enter') (e.preventDefault(), runPalette(active))
  })
  pal.addEventListener('pointermove', (e) => {
    const it = e.target.closest('.pal-item')
    if (it) {
      const k = visibleItems().indexOf(it)
      if (k !== active) moveHl(k)
    }
  })
  pal.addEventListener('click', (e) => {
    const it = e.target.closest('.pal-item')
    if (it) runPalette(visibleItems().indexOf(it))
  })

  // ------------------------------------------------------------------ 4. captura rápida
  const qa = $('#qa')
  const qi = $('#qa-q')
  const chipsEl = $('#qa-chips')
  const DIAS = ['hoy', 'mañana', 'pasado mañana', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
  const ic = (n) => `<i data-lucide="${n}" class="ic ic-14" aria-hidden="true"></i>`
  function parse(txt) {
    const out = []
    let title = ` ${txt} `
    const take = (re, fn) => {
      const m = title.match(re)
      if (m) {
        out.push(fn(m))
        title = title.replace(m[0], ' ')
      }
    }
    take(new RegExp(`\\s(${DIAS.join('|')})(?=\\s)`, 'i'), (m) => ({ k: 'fecha', html: `${ic('calendar')}${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}` }))
    take(/\s([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, (m) => ({ k: 'hora', html: `${ic('clock')}<span class="num">${m[1].padStart(2, '0')}:${m[2]}</span>` }))
    take(/\sp([1-4])(?=\s)/i, (m) => ({ k: 'prio', html: P.prio(+m[1]) }))
    take(/\s#([\wáéíóúñ]+)(?=\s)/i, (m) => {
      const p = D.proyectos.find((p) => p.id === m[1].toLowerCase() || p.nombre.toLowerCase() === m[1].toLowerCase())
      return { k: 'proyecto', html: p ? `<span class="dot" style="background:${p.color}"></span>${p.nombre}` : `${ic('folder-plus')}Nuevo: ${m[1]}` }
    })
    take(/\s(\d{1,3})\s?(min|m|h)(?=\s)/i, (m) => ({ k: 'est', html: `${ic('timer')}<span class="num">${m[1]} ${m[2].toLowerCase() === 'h' ? 'h' : 'min'}</span>` }))
    return { chips: out, title: title.replace(/\s+/g, ' ').trim() }
  }
  function renderChips() {
    const { chips } = parse(qi.value)
    const have = new Map($$('.chip:not(.is-leaving)', chipsEl).map((c) => [c.dataset.k, c]))
    chips.forEach((c) => {
      const el = have.get(c.k)
      if (el) {
        if (el.dataset.h !== c.html) {
          el.innerHTML = c.html
          el.dataset.h = c.html
          A(el, { scale: [0.92, 1] }, SP.pop)
        }
        have.delete(c.k)
        return
      }
      const n = document.createElement('span')
      n.className = 'chip is-new'
      n.dataset.k = c.k
      n.dataset.h = c.html
      n.innerHTML = c.html
      chipsEl.append(n)
      if (X.chipIn) X.chipIn(n, fx)
      else A(n, { opacity: [0, 1], scale: [0.6, 1], y: [6, 0] }, SP.pop)
    })
    have.forEach((el) => {
      el.classList.add('is-leaving')
      A(el, { opacity: 0, scale: 0.8 }, { duration: 0.14 }).then(() => el.remove())
    })
    icons()
  }
  qi.addEventListener('input', renderChips)
  qi.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') (e.preventDefault(), createTask())
  })

  // El diálogo nace del botón que lo abre (transformación de elemento compartido).
  function rectMorph(el, fromRect) {
    const to = el.getBoundingClientRect()
    return {
      x: [fromRect.left + fromRect.width / 2 - (to.left + to.width / 2), 0],
      y: [fromRect.top + fromRect.height / 2 - (to.top + to.height / 2), 0],
      scaleX: [fromRect.width / to.width, 1],
      scaleY: [fromRect.height / to.height, 1],
    }
  }
  async function openQuick(from) {
    if (top && top !== 'qa') await close()
    top = 'qa'
    opener = from || document.activeElement
    qi.value = ''
    chipsEl.innerHTML = ''
    qa.hidden = false
    if (scrim.hidden) showScrim(true)
    const fr = (from && from.offsetParent ? from : $('[data-act="nueva"]')).getBoundingClientRect()
    const content = $('.qa-content', qa)
    content.style.opacity = 0
    qi.focus({ preventScroll: true })
    A(qa, { ...rectMorph(qa, fr), opacity: [0.4, 1] }, SP.ui)
    await wait(90)
    A(content, { opacity: [0, 1], y: [8, 0] }, { duration: 0.22, ease: SP.ease })
  }
  async function closeQuick(toEl) {
    top = null
    showScrim(false)
    const content = $('.qa-content', qa)
    A(content, { opacity: 0 }, { duration: 0.1 })
    const target = (toEl || opener || $('[data-act="nueva"]'))
    if (target && target.offsetParent) {
      const r = target.getBoundingClientRect()
      const m = rectMorph(qa, r)
      await A(qa, { x: m.x[0], y: m.y[0], scaleX: m.scaleX[0], scaleY: m.scaleY[0], opacity: 0 }, { ...SP.ui, stiffness: (SP.ui.stiffness || 500) * 1.1 })
    } else await A(qa, { opacity: 0, scale: 0.97 }, { duration: 0.15 })
    qa.hidden = true
    M.animate(qa, { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 1 }, { duration: 0 })
    if (!toEl && opener) opener.focus?.()
  }
  async function typeExample() {
    qi.value = ''
    renderChips()
    qi.focus()
    for (const ch of D.capturaEjemplo) {
      qi.value += ch
      if (ch === ' ') renderChips()
      if (lv() === 'full' || lv() === 'soft') await new Promise((r) => setTimeout(r, 28))
    }
    qi.value += ' '
    renderChips()
    qi.value = qi.value.trim()
  }
  $('#qa-example').addEventListener('click', typeExample)
  $('#qa-ok').addEventListener('click', createTask)
  async function createTask() {
    const { title } = parse(qi.value)
    if (!title) {
      A(qi, { x: [0, -6, 6, -3, 0] }, { duration: 0.3 })
      return
    }
    const pend = $('.rows-plan')
    const tmp = document.createElement('ul')
    const p = parse(qi.value)
    const proyecto = (p.chips.find((c) => c.k === 'proyecto') || {}).html?.match(/<\/span>(.+)$/)?.[1]?.toLowerCase()
    const prio = +((qi.value.match(/\bp([1-4])\b/i) || [])[1] || 3)
    const hora = (qi.value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/) || [])[0] || null
    tmp.innerHTML = window.NX_ROW({ titulo: title, estado: 'pendiente', prioridad: prio, proyecto: D.proyectos.find((x) => x.nombre.toLowerCase() === proyecto)?.id, hora, est: null }, D.plan.length + Math.random(), false)
    const row = tmp.firstElementChild
    row.classList.add('is-new')
    const rows = $$('.row', pend)
    const others = [...rows, $('.done-head'), ...$$('.row', $('.rows-done'))]
    closeQuick(pend)
    await wait(140)
    await flip(others, () => pend.prepend(row))
    icons()
    if (X.inserted) X.inserted(row, fx)
    else A(row, { opacity: [0, 1], y: [-10, 0] }, SP.pop)
    setCount('total', state.total + 1)
    document.dispatchEvent(new CustomEvent('nx:plan'))
    toast('Tarea creada', 'plus')
    live(`Tarea creada: ${title}`)
  }

  // ------------------------------------------------------------------ 8. modo foco
  const focusEl = $('#focus')
  let timer = null
  let remaining = 33 * 60
  let paused = false
  const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const renderTimer = () => {
    const el = $('#focus-timer')
    X.timerRender ? X.timerRender(el, mmss(remaining), fx) : (el.textContent = mmss(remaining))
    const fill = $('#focus-fill')
    if (fill) fill.style.transform = `scaleX(${1 - remaining / (45 * 60)})`
  }
  async function enterFocus() {
    if (top) await close()
    top = 'focus'
    opener = document.activeElement
    const now = $('#now')
    focusEl.hidden = false
    renderTimer()
    root.classList.add('is-focus')
    $('#focus-pause').focus({ preventScroll: true })
    if (X.focusEnter) await X.focusEnter(now, focusEl, fx)
    else {
      const r = now.getBoundingClientRect()
      const inset = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 12px)`
      await A(focusEl, { clipPath: [inset, 'inset(0px 0px 0px 0px round 0px)'] }, { duration: 0.6, ease: SP.ease })
    }
    clearInterval(timer)
    timer = setInterval(() => {
      if (paused || remaining <= 0) return
      remaining -= 1
      renderTimer()
    }, 1000)
  }
  async function exitFocus() {
    top = null
    clearInterval(timer)
    const now = $('#now')
    if (X.focusExit) await X.focusExit(now, focusEl, fx)
    else {
      const r = now.getBoundingClientRect()
      await A(focusEl, { clipPath: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 12px)`, opacity: [1, 0.6] }, { duration: 0.42, ease: SP.ease })
    }
    focusEl.hidden = true
    focusEl.style.clipPath = ''
    focusEl.style.opacity = ''
    root.classList.remove('is-focus')
    opener?.focus?.({ preventScroll: true })
  }
  $('#focus-pause').addEventListener('click', (e) => {
    paused = !paused
    const b = e.currentTarget
    b.querySelector('span').textContent = paused ? 'Seguir' : 'Pausar'
    b.querySelector('svg')?.replaceWith(Object.assign(document.createElement('i'), { className: 'ic ic-14' }))
    b.querySelector('i').dataset.lucide = paused ? 'play' : 'pause'
    icons()
    A($('#focus-timer'), { opacity: paused ? 0.45 : 1 }, { duration: 0.25 })
  })
  focusEl.addEventListener('click', (e) => {
    const s = e.target.closest('.sub')
    if (!s) return
    const done = !s.classList.contains('is-done')
    s.classList.toggle('is-done', done)
    s.setAttribute('aria-pressed', done)
    const holder = document.createElement('span')
    holder.innerHTML = P.status(done ? 'hecha' : 'pendiente')
    s.firstElementChild.replaceWith(holder.firstElementChild)
    const svg = s.firstElementChild
    if (done) {
      A($('.st-fill', svg) || svg, { scale: [0.4, 1] }, SP.pop)
      const ck = $('.st-check', svg)
      if (ck) A(ck, { strokeDashoffset: [1, 0] }, { duration: 0.3, delay: 0.06, ease: SP.ease })
      A($('span', s), { backgroundSize: ['0% var(--strike, 1px)', '100% var(--strike, 1px)'] }, { duration: 0.34, ease: SP.ease })
    }
  })

  // ------------------------------------------------------------------ 7. tema
  const themeBtn = $('.theme-btn')
  const syncThemeLabel = () => themeBtn && themeBtn.setAttribute('aria-label', `Cambiar a tema ${root.dataset.theme === 'dark' ? 'claro' : 'oscuro'} (t)`)
  syncThemeLabel()
  function toggleTheme(origin) {
    const apply = () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
      syncThemeLabel()
      const u = new URL(location)
      u.searchParams.set('theme', root.dataset.theme)
      history.replaceState(null, '', u)
    }
    if (!document.startViewTransition || lv() === 'off' || lv() === 'none') return apply()
    const r = (origin && origin.offsetParent ? origin : themeBtn).getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const vt = document.startViewTransition(apply)
    vt.ready.then(() => {
      const kf = X.themeKeyframes ? X.themeKeyframes({ x, y, r: rad }) : { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] }
      root.animate(kf, { duration: (X.themeDuration || 620) * (lv() === 'soft' ? 0.65 : 1), easing: X.themeEasing || 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' })
    })
  }

  // ------------------------------------------------------------------ eventos
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.status-btn')
    if (b && b.closest('.rows-plan, .rows-done')) return complete(b.closest('.row'))
    const act = e.target.closest('[data-act]')
    if (act) {
      e.preventDefault()
      const a = act.dataset.act
      if (a === 'paleta') openPalette()
      if (a === 'nueva') openQuick(act)
      if (a === 'foco') enterFocus()
      if (a === 'tema') toggleTheme(act)
    }
    if (e.target.closest('[data-close]')) close()
    if (e.target === scrim) close()
    const m = e.target.closest('[data-motion]')
    if (m) {
      level = m.dataset.motion
      $$('[data-motion]').forEach((x) => x.setAttribute('aria-checked', x === m))
      toast(level === 'full' ? 'Animación completa' : level === 'soft' ? 'Animación suave, sin rebotes' : 'Sin animación, solo fundidos', 'sparkles')
    }
  })
  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches('input, textarea, [contenteditable]')
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') return (e.preventDefault(), top === 'pal' ? closePalette() : openPalette())
    if (e.key === 'Escape' && top) return (e.preventDefault(), close())
    if (typing || e.ctrlKey || e.metaKey || e.altKey) return
    if (top === 'focus' && e.key !== 't') return
    if (e.key === 'i' || e.key === 'c') (e.preventDefault(), openQuick($('[data-act="nueva"]')))
    if (e.key === 'f' && !top) (e.preventDefault(), enterFocus())
    if (e.key === 't') (e.preventDefault(), toggleTheme(themeBtn))
    if (e.key === 'x' && !top) complete($('.rows-plan .row.is-cursor'))
  })

  // Piezas internas para la segunda pasada (pasada2.js), que solo carga la dirección elegida.
  window.NX_I = { complete, openPalette, closePalette, openQuick, closeQuick, typeExample, createTask, enterFocus, exitFocus, toggleTheme, toast, setCount, state, close, top: () => top, filter, runPalette, visibleItems }

  // ------------------------------------------------------------------ 11. entrada (una sola vez)
  if (lv() !== 'none') {
    if (X.enter) X.enter(fx)
    else {
      const blocks = $$('.page-head, .col-main > *, .col-side > *')
      A(blocks, { opacity: [0, 1], y: [14, 0] }, { ...SP.soft, delay: M.stagger(0.05) })
    }
  }
  // Abrir una capa desde la URL (para capturas y para comparar.html): ?open=paleta|nueva|foco
  const o = params.get('open')
  if (o === 'paleta') openPalette()
  if (o === 'nueva') openQuick($('[data-act="nueva"]')).then(() => params.get('ejemplo') === '1' && typeExample())
  if (o === 'foco') enterFocus()
})()
