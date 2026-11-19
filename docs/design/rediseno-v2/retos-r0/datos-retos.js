// Retos R0 · datos demo, los mismos para las tres variantes. Hoy es el jueves 19 de noviembre de 2026.
// Nada de esto sale de la app: es solo para enseñar los estados.
//
// Reglas de los dos tipos de la v1 (las fija R0 y las implementa R1):
// - Misión diaria: de 1 a 3 al día, generadas SOLO con datos que la app ya registra (tareas,
//   sesiones de foco, check-in y hábitos). Se cumplen solas al darse el dato: no se marcan a mano.
// - Reto propio: el usuario marca cada día. Duración fija. La racha cuenta días seguidos cubiertos.
//   Un día sin marcar gasta un escudo si queda alguno («escudo»); si no queda, es un fallo y la
//   racha vuelve a 0. «Hoy no» gasta un escudo a propósito, sin esperar al día siguiente.
;(function () {
  const HOY = '2026-11-19'
  const add = (iso, n) => {
    const d = new Date(iso + 'T12:00:00')
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5)
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  const corta = (iso) => {
    const d = new Date(iso + 'T12:00:00')
    return `${d.getDate()} ${MESES[d.getMonth()]}`
  }
  const larga = (iso) => {
    const d = new Date(iso + 'T12:00:00')
    return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
  }

  // Estados de un día: hecho · escudo (fallo cubierto) · hoyno (escudo gastado a propósito) · fallo · hoy · futuro
  function reto({ id, titulo, nota, inicio, duracion, escudos, especiales = {}, hoyHecho = false, fin = null }) {
    const dias = []
    for (let i = 0; i < duracion; i++) {
      const fecha = add(inicio, i)
      let estado
      if (especiales[i + 1]) estado = especiales[i + 1]
      else if (fin ? fecha <= fin : fecha < HOY) estado = 'hecho'
      else if (fecha === HOY) estado = hoyHecho ? 'hecho' : 'hoy'
      else estado = 'futuro'
      dias.push({ n: i + 1, fecha, estado })
    }
    const pasados = dias.filter((d) => d.estado !== 'futuro' && d.estado !== 'hoy')
    let racha = 0
    let mejor = 0
    for (const d of pasados) {
      if (d.estado === 'fallo') racha = 0
      else racha++
      mejor = Math.max(mejor, racha)
    }
    const usados = dias.filter((d) => d.estado === 'escudo' || d.estado === 'hoyno').length
    const hechos = dias.filter((d) => d.estado === 'hecho').length
    const diaActual = fin ? duracion : diasEntre(inicio, HOY) + 1
    return {
      id,
      titulo,
      nota,
      inicio,
      finPrevisto: add(inicio, duracion - 1),
      duracion,
      diaActual,
      quedan: duracion - diaActual,
      escudos,
      escudosUsados: usados,
      escudosLibres: escudos - usados,
      racha,
      mejor,
      hechos,
      cumplimiento: Math.round((hechos / Math.max(pasados.length, 1)) * 100),
      hoyHecho,
      ultimoDia: !fin && diaActual === duracion,
      xpDia: 5,
      xpFinal: duracion * 2,
      estado: fin ? 'cumplido' : 'activo',
      fin,
      dias,
    }
  }

  const retos = [
    reto({
      id: 'leer',
      titulo: 'Leer 20 minutos',
      nota: 'Antes de dormir, en papel.',
      inicio: '2026-10-21',
      duracion: 30,
      escudos: 3,
      especiales: { 6: 'escudo', 22: 'hoyno' },
    }),
    reto({
      id: 'pantallas',
      titulo: 'Sin pantallas tras las 23:00',
      nota: 'El móvil se queda cargando en la cocina.',
      inicio: '2026-11-10',
      duracion: 21,
      escudos: 1,
      especiales: { 4: 'escudo', 7: 'fallo' },
    }),
    reto({
      id: 'caminar',
      titulo: 'Caminar 8.000 pasos',
      nota: 'Vale cualquier paseo; lo apunto al volver.',
      inicio: '2026-10-01',
      duracion: 66,
      escudos: 3,
      especiales: { 18: 'escudo', 35: 'escudo' },
      hoyHecho: true,
    }),
  ]

  const cumplidos = [
    reto({
      id: 'meditar',
      titulo: 'Meditar 10 minutos',
      nota: '',
      inicio: '2026-10-06',
      duracion: 21,
      escudos: 1,
      especiales: { 9: 'escudo' },
      fin: '2026-10-26',
    }),
  ]

  // Misiones de hoy. `fuente` es el dato de la app del que sale cada una (regla: nada de seguimiento nuevo).
  const misiones = [
    { id: 'm-tareas', titulo: 'Completa 5 tareas hoy', fuente: 'Tareas', icono: 'list-todo', actual: 4, meta: 5, unidad: 'tareas', xp: 15 },
    { id: 'm-foco', titulo: '60 min de foco', fuente: 'Foco', icono: 'timer', actual: 60, meta: 60, unidad: 'min', xp: 15, cumplidaA: '11:05' },
    { id: 'm-checkin', titulo: 'Haz el check-in del día', fuente: 'Check-in', icono: 'heart-pulse', actual: 0, meta: 1, unidad: '', xp: 10 },
  ]

  const plantillas = [
    { titulo: 'Leer 20 minutos', duracion: 30, escudos: 2 },
    { titulo: 'Sin azúcar añadido', duracion: 21, escudos: 1 },
    { titulo: 'Escribir tres líneas de diario', duracion: 66, escudos: 3 },
  ]

  window.RT = {
    HOY,
    reto,
    hoyLargo: 'Jueves, 19 de noviembre',
    reloj: '16:20',
    add,
    corta,
    larga,
    retos,
    cumplidos,
    misiones,
    plantillas,
    duraciones: [7, 21, 30, 66],
    usuario: { nivel: 17, xp: 690, xpNivel: 850, xpHoy: 45, escudosMes: 1 },
    hoyNumeros: {
      focoMin: 85,
      focoMedia: '+12 min sobre tu media',
      barras: [
        { l: 'V', m: 40 },
        { l: 'S', m: 0 },
        { l: 'D', m: 25 },
        { l: 'L', m: 90 },
        { l: 'M', m: 65 },
        { l: 'X', m: 70 },
        { l: 'J', m: 85, hoy: true },
      ],
      tareas: [4, 7],
    },
  }
})()
