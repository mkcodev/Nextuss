// Ronda 2 · segunda pasada de interacciones. Solo la carga la dirección elegida (Línea).
// 2 cursor j/k · 5 reordenar (arrastrar o Alt + flechas) · 6 dock con pestañas animadas
// 9 atrasadas: mover o aparcar todas con «Deshacer» · 10 check-in y hábitos
// 12 móvil: deslizar filas y píldora de la barra inferior · 14 demo guiada (?demo=1 o botón)
// Mismas reglas: todo responde a una acción; sin bucles ambientales; reduced-motion = fundidos.
;(function () {
  const I = window.NX_I
  const fx = window.NX_FX
  const { A, SP, M, $, $$, lv, toast, icons, D } = fx
  const st = I.state
  Object.assign(st, { atrasadas: D.atrasadas.total, ck: 2, habitos: 2 })
  document.documentElement.classList.add('p2')
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const isMobile = () => matchMedia('(max-width: 767px)').matches
  const live = (t) => ($('#live').textContent = t)
  const plan = () => document.dispatchEvent(new CustomEvent('nx:plan'))

  // ------------------------------------------------------------------ 2. cursor j/k
  const pend = $('.rows-plan')
  const hl = document.createElement('li')
  hl.className = 'cursor-hl'
  hl.setAttribute('aria-hidden', 'true')
  pend.append(hl) // al final: no rompe .row:first-child
  function placeCursor(instant) {
    const r = $('.rows-plan .row.is-cursor')
    if (!r) return A(hl, { opacity: 0 }, { duration: 0.12 })
    const kf = { y: r.offsetTop, height: `${r.offsetHeight}px`, opacity: 1 }
    return instant ? M.animate(hl, kf, { duration: 0 }) : A(hl, kf, SP.ui)
  }
  function setCursor(row, instant) {
    $$('.row', pend).forEach((r) => r.classList.toggle('is-cursor', r === row))
    placeCursor(instant)
  }
  function moveCursor(d) {
    const rows = $$('.row', pend)
    if (!rows.length) return
    const i = Math.max(0, Math.min(rows.length - 1, rows.findIndex((r) => r.classList.contains('is-cursor')) + d))
    setCursor(rows[i])
    rows[i].scrollIntoView({ block: 'nearest' })
    live(rows[i].querySelector('.row-title').textContent)
  }
  document.fonts.ready.then(() => placeCursor(true))
  addEventListener('resize', () => placeCursor(true))
  document.addEventListener('nx:plan', () => {
    if (!$('.rows-plan .row.is-cursor')) $('.rows-plan .row')?.classList.add('is-cursor')
    placeCursor()
  })

  // ------------------------------------------------------------------ 5. reordenar
  function reorder(row, to) {
    const rows = $$('.row', pend)
    const from = rows.indexOf(row)
    if (from < 0 || to === from || to < 0 || to >= rows.length) return Promise.resolve()
    return fx
      .flip(rows, () => (to > from ? rows[to].after(row) : rows[to].before(row)))
      .then(() => {
        placeCursor()
        live(`Movida a la posición ${to + 1}`)
      })
  }
  pend.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.row')
    if (!row || e.button !== 0 || e.target.closest('button, a, input')) return
    if (isMobile()) return swipe(e, row)
    const rows = $$('.row', pend)
    const from = rows.indexOf(row)
    const h = row.offsetHeight
    const y0 = e.clientY
    let drag = false
    let to = from
    const move = (ev) => {
      const dy = ev.clientY - y0
      if (!drag) {
        if (Math.abs(dy) < 5) return
        drag = true
        row.classList.add('is-dragging')
        setCursor(row, true)
        A(hl, { opacity: 0 }, { duration: 0.1 })
        A(row, { scale: 1.015 }, SP.pop)
      }
      M.animate(row, { y: dy }, { duration: 0 })
      const t = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)))
      if (t === to) return
      to = t
      rows.forEach((r, i) => {
        if (r === row) return
        const s = from < to && i > from && i <= to ? -h : from > to && i < from && i >= to ? h : 0
        A(r, { y: s }, SP.ui)
      })
    }
    const up = async () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      if (!drag) return setCursor(row)
      const first = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]))
      rows.forEach((r) => M.animate(r, { y: 0 }, { duration: 0 }))
      if (to !== from) to > from ? rows[to].after(row) : rows[to].before(row)
      rows.forEach((r) => {
        const d = first.get(r) - r.getBoundingClientRect().top
        if (d) A(r, { y: [d, 0] }, SP.ui)
      })
      await A(row, { scale: 1 }, SP.ui)
      row.classList.remove('is-dragging')
      placeCursor()
      if (to !== from) live(`Movida a la posición ${to + 1}`)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  })

  // ------------------------------------------------------------------ 12. móvil: deslizar filas
  function swipe(e, row) {
    const x0 = e.clientX
    const y0 = e.clientY
    const w = row.offsetWidth
    let mode = null
    let dx = 0
    let under = null
    const move = (ev) => {
      const ddx = ev.clientX - x0
      const ddy = ev.clientY - y0
      if (!mode) {
        if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return
        mode = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'
        if (mode === 'y') return end()
        under = document.createElement('li')
        under.className = 'swipe-under'
        under.setAttribute('aria-hidden', 'true')
        under.style.top = `${row.offsetTop}px`
        under.style.height = `${row.offsetHeight}px`
        under.innerHTML = '<span class="sw-l"><i data-lucide="check" class="ic ic-16"></i>Hecha</span><span class="sw-r">Mañana<i data-lucide="sunrise" class="ic ic-16"></i></span>'
        pend.append(under)
        icons()
        row.classList.add('is-swiping')
      }
      dx = ddx
      M.animate(row, { x: dx }, { duration: 0 })
      under.dataset.dir = dx > 0 ? 'done' : 'later'
      const armed = Math.abs(dx) > w * 0.3
      if (armed !== under.classList.contains('is-armed')) {
        under.classList.toggle('is-armed', armed)
        A(under.querySelector(dx > 0 ? '.sw-l' : '.sw-r'), { scale: [0.85, 1] }, SP.pop)
      }
    }
    const end = async () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', end)
      removeEventListener('pointercancel', end)
      if (mode !== 'x') return
      if (dx > w * 0.3) {
        await A(row, { x: 0 }, SP.ui)
        row.classList.remove('is-swiping')
        under.remove()
        I.complete(row)
      } else if (dx < -w * 0.3) {
        await A(row, { x: -w }, { duration: 0.18, ease: SP.ease })
        later(row, under)
      } else {
        await A(row, { x: 0 }, SP.ui)
        row.classList.remove('is-swiping')
        under.remove()
      }
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', end)
    addEventListener('pointercancel', end)
  }
  async function later(row, under) {
    const next = row.nextElementSibling
    A(under, { opacity: 0 }, { duration: 0.2 })
    await A(row, { height: [`${row.offsetHeight}px`, '0px'], minHeight: ['0px', '0px'], opacity: 0 }, { duration: 0.24, ease: SP.ease })
    under.remove()
    row.remove()
    I.setCount('total', st.total - 1)
    plan()
    toast('Pasada a mañana', 'sunrise', {
      label: 'Deshacer',
      fn: () => {
        row.classList.remove('is-swiping')
        row.style.height = ''
        row.style.minHeight = ''
        M.animate(row, { x: 0, opacity: 1 }, { duration: 0 })
        next && next.parentElement === pend ? pend.insertBefore(row, next) : pend.append(row)
        A(row, { opacity: [0, 1], x: [-24, 0] }, SP.ui)
        I.setCount('total', st.total + 1)
        plan()
      },
    })
  }

  // ------------------------------------------------------------------ 12. móvil: píldora de la barra inferior
  const mob = $('.mobnav')
  const pill = document.createElement('span')
  pill.className = 'mob-pill'
  pill.setAttribute('aria-hidden', 'true')
  mob.prepend(pill)
  const placePill = (it, instant) => {
    if (!it || !it.offsetWidth) return
    const kf = { x: it.offsetLeft + it.offsetWidth / 2 - 24, opacity: 1 }
    instant ? M.animate(pill, kf, { duration: 0 }) : A(pill, kf, SP.ui)
  }
  const syncPill = () => placePill($('.mob-item.is-active'), true)
  syncPill()
  addEventListener('resize', syncPill)
  mob.addEventListener('click', (e) => {
    const it = e.target.closest('.mob-item')
    if (!it || it.dataset.act) return
    e.preventDefault()
    $$('.mob-item', mob).forEach((x) => {
      x.classList.toggle('is-active', x === it)
      x === it ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')
    })
    placePill(it)
    A(it.querySelector('svg'), { y: [0, -3, 0] }, { duration: 0.3, ease: SP.ease })
    const name = it.textContent.trim()
    if (name !== 'Hoy') toast(`${name} (no incluida en el mockup)`, 'info')
  })

  // ------------------------------------------------------------------ 6. dock
  const tabs = $$('.dock-tab')
  const ind = document.createElement('span')
  ind.className = 'dock-ind'
  ind.setAttribute('aria-hidden', 'true')
  $('.dock-tabs').prepend(ind)
  let cur = 0
  const placeInd = (t, instant) => {
    if (!t.offsetWidth) return
    const kf = { x: t.offsetLeft, width: `${t.offsetWidth}px`, opacity: 1 }
    instant ? M.animate(ind, kf, { duration: 0 }) : A(ind, kf, SP.ui)
  }
  document.fonts.ready.then(() => placeInd(tabs[cur], true))
  addEventListener('resize', () => placeInd(tabs[cur], true))
  async function selectTab(i, focus) {
    if (i === cur) return
    const dir = i > cur ? 1 : -1
    const old = $(`#dp-${cur}`)
    const nu = $(`#dp-${i}`)
    tabs.forEach((t, k) => {
      t.classList.toggle('is-on', k === i)
      t.setAttribute('aria-selected', k === i)
      t.tabIndex = k === i ? 0 : -1
    })
    if (focus) tabs[i].focus()
    placeInd(tabs[i])
    cur = i
    await A(old, { opacity: 0, x: -12 * dir }, { duration: 0.12, ease: SP.out })
    old.hidden = true
    nu.hidden = false
    A(nu, { opacity: [0, 1], x: [16 * dir, 0] }, SP.ui)
    A([...nu.children], { opacity: [0, 1], y: [6, 0] }, { ...SP.ui, delay: M.stagger(0.03) })
  }
  tabs.forEach((t, i) => t.addEventListener('click', () => selectTab(i)))
  $('.dock-tabs').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') selectTab((cur + 1) % tabs.length, true)
    if (e.key === 'ArrowLeft') selectTab((cur + tabs.length - 1) % tabs.length, true)
  })

  // ------------------------------------------------------------------ 9. atrasadas
  let atrBusy = false
  async function clearOverdue(kind) {
    const list = $('.rows-overdue')
    const rows = $$('.row-overdue', list)
    if (atrBusy || list.hidden) return
    atrBusy = true
    const sec = list.closest('.block')
    const more = $('.more', sec)
    const acts = $('.block-actions', sec)
    const empty = $('.atr-empty', sec)
    await A(rows, { x: kind === 'manana' ? 56 : -56, opacity: 0 }, { duration: 0.26, ease: SP.out, delay: M.stagger(0.06) })
    A([more, acts], { opacity: 0 }, { duration: 0.15 })
    await A(list, { height: [`${list.offsetHeight}px`, '0px'], opacity: [1, 0] }, { duration: 0.24, ease: SP.ease })
    list.hidden = more.hidden = true
    acts.style.visibility = 'hidden'
    $('.atr-empty-why', empty).textContent = kind === 'manana' ? 'Las 7 pasan a mañana.' : 'Las 7 quedan aparcadas.'
    empty.hidden = false
    A(empty, { opacity: [0, 1], y: [6, 0] }, SP.ui)
    I.setCount('atrasadas', 0)
    atrBusy = false
    toast(kind === 'manana' ? '7 tareas movidas a mañana' : '7 tareas aparcadas', kind === 'manana' ? 'sunrise' : 'archive', {
      label: 'Deshacer',
      fn: async () => {
        empty.hidden = true
        list.hidden = more.hidden = false
        acts.style.visibility = ''
        list.style.height = ''
        const h = list.offsetHeight
        M.animate(rows, { x: 0, opacity: 0 }, { duration: 0 })
        A([more, acts], { opacity: [0, 1] }, { duration: 0.2 })
        A(list, { height: ['0px', `${h}px`], opacity: [0, 1] }, SP.ui).then(() => (list.style.height = ''))
        A(rows, { opacity: [0, 1], x: [kind === 'manana' ? 40 : -40, 0] }, { ...SP.ui, delay: M.stagger(0.05, { startDelay: 0.08 }) })
        I.setCount('atrasadas', D.atrasadas.total)
      },
    })
  }

  // ------------------------------------------------------------------ 10. check-in y hábitos
  const placeCk = (sc, b, instant) => {
    const k = $('.ck-ind', sc)
    const kf = { x: b.offsetLeft, width: `${b.offsetWidth}px`, opacity: 1 }
    instant ? M.animate(k, kf, { duration: 0 }) : A(k, kf, SP.ui)
  }
  const initCk = () =>
    $$('.ck-scale').forEach((sc) => {
      if (!$('.ck-ind', sc)) {
        const k = document.createElement('span')
        k.className = 'ck-ind'
        k.setAttribute('aria-hidden', 'true')
        sc.prepend(k)
      }
      const on = $('.ck.is-on', sc)
      if (on) placeCk(sc, on, true)
    })
  document.fonts.ready.then(initCk)
  addEventListener('resize', initCk)
  function pick(b, focus) {
    const sc = b.closest('.ck-scale')
    const was = $('.ck.is-on', sc)
    if (was === b) return
    $$('.ck', sc).forEach((x) => {
      const on = x === b
      x.classList.toggle('is-on', on)
      x.classList.toggle('is-below', +x.textContent < +b.textContent)
      x.setAttribute('aria-checked', on)
      x.tabIndex = on ? 0 : -1
    })
    if (focus) b.focus()
    placeCk(sc, b, !was)
    if (!was) A($('.ck-ind', sc), { opacity: [0, 1], scale: [0.6, 1] }, SP.pop)
    A(b, { scale: [0.9, 1] }, SP.pop)
    if (!was) {
      const p = sc.parentElement.querySelector('.ck-pending')
      if (p) A(p, { opacity: 0 }, { duration: 0.2 }).then(() => (p.hidden = true))
      I.setCount('ck', st.ck + 1)
      fx.fly(b, $('#level'), '+5 XP')
      I.setCount('xpHoy', st.xpHoy + 5)
    }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.ck')
    if (b) pick(b)
    const h = e.target.closest('.habit-check')
    if (h && !h.disabled) toggleHabit(h)
  })
  document.addEventListener('keydown', (e) => {
    const b = e.target.closest?.('.ck')
    if (!b || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return
    e.preventDefault()
    const all = $$('.ck', b.parentElement)
    const n = all[Math.max(0, Math.min(all.length - 1, all.indexOf(b) + (e.key === 'ArrowRight' ? 1 : -1)))]
    pick(n, true)
  })
  function toggleHabit(b) {
    const done = !b.classList.contains('is-done')
    const habit = b.closest('.habit')
    const name = $('.habit-name', habit).textContent
    b.classList.toggle('is-done', done)
    b.setAttribute('aria-pressed', done)
    b.setAttribute('aria-label', `${name}: ${done ? 'hecho hoy' : 'marcar como hecho'}`)
    b.innerHTML = done ? '<i data-lucide="check" class="ic ic-14" aria-hidden="true"></i>' : ''
    const wd = $$('.wd', habit)[D.hoyIndice]
    wd.classList.toggle('wd-hecho', done)
    wd.classList.toggle('wd-toca', !done)
    wd.innerHTML = done ? '<i data-lucide="check" class="ic ic-12" aria-hidden="true"></i>' : '<span aria-hidden="true">M</span>'
    icons()
    A(b, { scale: [0.6, 1] }, SP.pop)
    A(wd, { scale: [0.4, 1] }, { ...SP.pop, delay: 0.08 })
    I.setCount('habitos', st.habitos + (done ? 1 : -1))
    if (done) {
      fx.fly(b, $('#level'), '+5 XP')
      I.setCount('xpHoy', st.xpHoy + 5)
    }
    live(`${name}: ${done ? 'hecho hoy' : 'pendiente'}`)
  }

  // ------------------------------------------------------------------ teclado
  const hint = $('.plan .hint')
  if (hint) hint.insertAdjacentHTML('afterbegin', '<span><kbd>j</kbd><kbd>k</kbd> moverse</span><span><kbd>Alt</kbd><kbd>↑</kbd><kbd>↓</kbd> reordenar</span>')
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act^="atr-"]')
    if (a) clearOverdue(a.dataset.act === 'atr-manana' ? 'manana' : 'aparcar')
  })
  document.addEventListener('keydown', (e) => {
    if (I.top() || e.target.matches('input, textarea') || e.ctrlKey || e.metaKey) return
    const onBody = e.target === document.body || e.target.closest('.rows-plan')
    if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const r = $('.rows-plan .row.is-cursor')
      if (r) reorder(r, $$('.row', pend).indexOf(r) + (e.key === 'ArrowDown' ? 1 : -1))
      return
    }
    if (e.altKey) return
    if (e.key === 'j' || (onBody && e.key === 'ArrowDown')) (e.preventDefault(), moveCursor(1))
    if (e.key === 'k' || (onBody && e.key === 'ArrowUp')) (e.preventDefault(), moveCursor(-1))
    if (e.key === 'Enter' && onBody && $('.rows-plan .row.is-cursor')) toast('Abrir la tarea (no incluida en el mockup)', 'info')
  })

  // ------------------------------------------------------------------ 14. demo guiada
  let cap = null
  async function caption(text) {
    if (cap) {
      const old = cap
      cap = null
      A(old, { opacity: 0, y: -6 }, { duration: 0.15 }).then(() => old.remove())
    }
    if (!text) return
    cap = document.createElement('div')
    cap.className = 'demo-cap'
    cap.textContent = text
    document.body.append(cap)
    A(cap, { opacity: [0, 1], y: [-8, 0] }, SP.pop)
    await wait(350)
  }
  const go = async (el, block = 'center') => {
    if (!el) return
    el.scrollIntoView({ behavior: lv() === 'full' || lv() === 'soft' ? 'smooth' : 'auto', block })
    await wait(700)
  }
  let running = false
  async function demo() {
    if (running) return
    running = true
    window.NX_DEMO_DONE = false
    scrollTo({ top: 0 })
    await wait(500)
    if (!isMobile() && $('.dock').offsetWidth) {
      await caption('Panel derecho: pestañas')
      for (const i of [1, 2, 0]) {
        await selectTab(i)
        await wait(900)
      }
    }
    await caption('Moverse con j y k')
    await go($('.plan'))
    for (const d of [1, 1, -1]) {
      moveCursor(d)
      await wait(500)
    }
    await caption('Completar con x')
    await I.complete($('.rows-plan .row.is-cursor'))
    await wait(900)
    await caption('Reordenar: arrastrar o Alt + flechas')
    const r = $('.rows-plan .row.is-cursor')
    await reorder(r, $$('.row', pend).indexOf(r) + 2)
    await wait(900)
    await caption('Captura rápida: entiende fecha, hora, prioridad, #proyecto y duración')
    await I.openQuick($('[data-act="nueva"]'))
    await I.typeExample()
    await wait(800)
    await I.createTask()
    await wait(1300)
    await caption('Atrasadas: mover todas y deshacer')
    await go($('.rows-overdue').closest('.block'))
    await clearOverdue('manana')
    await wait(1500)
    $$('.toast-act').pop()?.click()
    await wait(1500)
    await caption('Check-in y hábitos')
    await go($('.checkin'))
    pick($$('.ck-scale')[2].querySelectorAll('.ck')[3])
    await wait(1100)
    const hab = $$('.habit-check').find((h) => !h.disabled && !h.classList.contains('is-done'))
    if (hab) {
      await go(hab)
      toggleHabit(hab)
    }
    await wait(1300)
    await caption('Paleta: Ctrl K')
    scrollTo({ top: 0, behavior: 'smooth' })
    await wait(500)
    await I.openPalette()
    const q = $('#pal-q')
    for (const ch of 'foco') {
      q.value += ch
      q.dispatchEvent(new Event('input'))
      await wait(140)
    }
    await wait(700)
    await caption('Modo foco')
    I.runPalette(0)
    await wait(3600)
    await I.exitFocus()
    await wait(900)
    await caption('Tema: t')
    I.toggleTheme($('.theme-btn'))
    await wait(1700)
    I.toggleTheme($('.theme-btn'))
    await wait(1700)
    await caption(null)
    running = false
    window.NX_DEMO_DONE = true
  }
  const mk = $('.mk')
  if (mk) {
    mk.insertAdjacentHTML('beforeend', '<button type="button" class="mk-demo"><i data-lucide="play" class="ic ic-14" aria-hidden="true"></i>Demo guiada</button>')
    icons()
    mk.querySelector('.mk-demo').addEventListener('click', demo)
  }
  if (new URLSearchParams(location.search).get('demo') === '1') setTimeout(demo, 1400)
  window.NX_DEMO = demo
})()
