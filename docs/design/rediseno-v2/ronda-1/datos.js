// Datos de ejemplo (sintéticos) compartidos por las tres direcciones del rediseño v2.
// Las tres pintan exactamente lo mismo: lo único que cambia entre ellas es la identidad visual.
// Escenario: martes por la mañana de alguien con TDAH que trabaja por su cuenta y por encargo.
window.NX_DATOS = {
  fecha: 'Martes, 17 de noviembre',
  ahoraReloj: '10:42',
  usuario: { iniciales: 'AR', nivel: 12, xp: 2340, xpSiguiente: 2800, xpHoy: 140 },

  navegacion: [
    { id: 'hoy', label: 'Hoy', icon: 'layout-grid', atajo: 'g h', activo: true },
    { id: 'planificacion', label: 'Planificación', icon: 'calendar-range', atajo: 'g p' },
    { id: 'habitos', label: 'Hábitos', icon: 'list-checks', atajo: 'g b' },
    { id: 'rutinas', label: 'Rutinas', icon: 'repeat', atajo: 'g u' },
    { id: 'estadisticas', label: 'Estadísticas', icon: 'bar-chart-3', atajo: 'g s' },
    { id: 'tareas', label: 'Tareas', icon: 'list-todo', atajo: 'g t' },
    { id: 'proyectos', label: 'Proyectos', icon: 'folder-kanban', atajo: 'g r' },
    { id: 'plugins', label: 'Plugins', icon: 'puzzle', atajo: 'g x' },
    { id: 'ajustes', label: 'Ajustes', icon: 'settings', atajo: 'g a' },
  ],

  // Colores de proyecto = datos del usuario (paleta de src/lib/colors.ts), no tokens del sistema.
  proyectos: [
    { id: 'trabajo', nombre: 'Trabajo', color: '#2f7d6b', pendientes: 9 },
    { id: 'autonomo', nombre: 'Autónomo', color: '#b7791f', pendientes: 4 },
    { id: 'casa', nombre: 'Casa', color: '#c0507a', pendientes: 6 },
    { id: 'salud', nombre: 'Salud', color: '#7a5cc0', pendientes: 2 },
  ],

  // Jornada y bloques del día (DayTimeCard + Timeline).
  jornada: { inicio: '08:00', fin: '20:00', restante: '9 h 18 min', sinPlanificar: '3 h 10 min' },
  bloques: [
    { inicio: '09:00', fin: '09:30', titulo: 'Enviar la factura de octubre', estado: 'hecha' },
    { inicio: '10:30', fin: '11:15', titulo: 'Responder a la gestoría sobre el IVA', estado: 'ahora' },
    { inicio: '11:15', fin: '11:25', titulo: 'Llamar al dentista', estado: 'siguiente' },
    { inicio: '12:00', fin: '13:30', titulo: 'Preparar la demo del jueves', estado: 'pendiente' },
    { inicio: '16:00', fin: '16:30', titulo: 'Revisar el PR de la pasarela de pagos', estado: 'pendiente' },
  ],

  ahora: {
    titulo: 'Responder a la gestoría sobre el IVA del trimestre',
    inicio: '10:30',
    fin: '11:15',
    duracion: '45 min',
    transcurridoMin: 12,
    totalMin: 45,
    quedan: 'quedan 33 min',
    proyecto: 'autonomo',
    prioridad: 2,
    energia: 'Media',
    objetivo: 'Papeleo al día',
    siguiente: { titulo: 'Llamar al dentista', cuando: 'en 33 min', duracion: '10 min' },
  },

  atrasadas: {
    total: 7,
    visibles: [
      { titulo: 'Renovar el DNI', hace: 'hace 12 días', proyecto: 'casa', prioridad: 3 },
      { titulo: 'Devolver el paquete de la tienda online', hace: 'hace 6 días', proyecto: 'casa', prioridad: 4 },
      { titulo: 'Contestar a Laura sobre la cena del sábado', hace: 'hace 3 días', proyecto: null, prioridad: 3 },
    ],
  },

  plan: [
    { hora: '09:00', titulo: 'Enviar la factura de octubre', estado: 'hecha', prioridad: 2, proyecto: 'autonomo', est: '30 min' },
    { hora: '10:30', titulo: 'Responder a la gestoría sobre el IVA', estado: 'en-curso', prioridad: 2, proyecto: 'autonomo', est: '45 min' },
    { hora: '11:15', titulo: 'Llamar al dentista para cambiar la cita', estado: 'pendiente', prioridad: 3, proyecto: 'salud', est: '10 min' },
    { hora: '12:00', titulo: 'Preparar la demo del jueves para el cliente', estado: 'pendiente', prioridad: 1, proyecto: 'trabajo', est: '1 h 30 min' },
    { hora: '16:00', titulo: 'Revisar el PR de la pasarela de pagos', estado: 'pendiente', prioridad: 2, proyecto: 'trabajo', est: '30 min' },
    { hora: null, titulo: 'Pedir cita para la ITV', estado: 'pendiente', prioridad: 3, proyecto: 'casa', est: '15 min' },
    { hora: null, titulo: 'Comprar pilas y bombillas', estado: 'pendiente', prioridad: 4, proyecto: 'casa', est: null },
  ],

  objetivoSemana: { titulo: 'Papeleo al día', hechas: 3, total: 5, atributo: 'Disciplina' },

  checkin: {
    preguntas: [
      { id: 'energia', label: 'Energía', valor: 3 },
      { id: 'animo', label: 'Ánimo', valor: 4 },
      { id: 'foco', label: 'Foco', valor: null },
    ],
  },

  // Semana de lunes a domingo; hoy = martes (índice 1).
  hoyIndice: 1,
  habitos: [
    { nombre: 'Medicación', pauta: 'Cada día', racha: 'racha de 23', semana: ['hecho', 'hecho', 'toca', 'toca', 'toca', 'toca', 'toca'], hechoHoy: true },
    { nombre: 'Caminar 20 min', pauta: 'Cada día', racha: 'mejor racha 9', semana: ['hecho', 'toca', 'toca', 'toca', 'toca', 'toca', 'toca'], hechoHoy: false },
    { nombre: 'Leer 15 min', pauta: 'L, X y V', racha: 'mejor racha 6', semana: ['hecho', 'descanso', 'toca', 'descanso', 'toca', 'descanso', 'descanso'], hechoHoy: null },
    { nombre: 'Vaciar la bandeja de entrada', pauta: 'Cada día', racha: 'racha de 4', semana: ['hecho', 'hecho', 'toca', 'toca', 'toca', 'toca', 'toca'], hechoHoy: true },
  ],
  sinPlanificar: 5,

  kpi: {
    foco: { valor: '1 h 05 min', meta: 'de 3 h', semana: [95, 140, 0, 60, 30, 120, 65], etiquetas: ['Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Lun', 'Hoy'] },
    tareas: { valor: '2 de 7', detalle: 'hechas hoy' },
    xp: { valor: '+140 XP', detalle: 'quedan 460 para el nivel 13' },
  },

  dock: {
    atributos: [
      { nombre: 'Disciplina', nivel: 8, progreso: 0.62 },
      { nombre: 'Salud', nivel: 6, progreso: 0.35 },
      { nombre: 'Mente', nivel: 7, progreso: 0.8 },
    ],
    logro: { titulo: '21 días seguidos', detalle: 'Medicación' },
  },
}
