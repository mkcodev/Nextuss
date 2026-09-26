const INFO = {
  A: {
    name: 'A · Plano técnico',
    thesis: 'El día como una hoja de plano: todo medido, etiquetado y en su casilla. Nada grita; la tinta azul marca lo que toca y el lápiz rojo solo las revisiones (atrasos).',
    why: 'Sale del mundo del dibujo técnico: cotas que miden la duración, cajetín con las propiedades de la tarea, reglas finas en vez de tarjetas y sombras. Ordena sin cargar.',
    palette: [['#f1f2ef','Película de plano'],['#1d2226','Grafito'],['#2447a8','Tinta azul: acción'],['#b0321c','Lápiz rojo: atraso']],
    type: 'Archivo (etiquetas estrechas) + JetBrains Mono solo para horas y cifras',
    risk: 'Las reglas finas pueden sentirse frías o "de oficina". Nativa en claro; el oscuro es menos natural.',
    raises: ['Modo foco (de la pared de streaming): todo lo que no es la tarea actual se atenúa.','Estados por forma (de la tensegridad): cuadrado vacío, lleno, tachado o discontinuo, no solo color.','Rejilla fija de etiqueta (de las cajas): hora · título · proyecto · duración siempre en el mismo sitio.','Ley de color (del arcade): azul = acción, rojo = atraso, nada más.']
  },
  B: {
    name: 'B · Cabina en calma',
    thesis: 'La filosofía de cabina "oscura y silenciosa": en vuelo normal no se enciende nada; solo se ilumina lo que necesita tu atención. Magenta = lo activo ahora, cian = valores que tú eliges, ámbar = atención, verde = hecho.',
    why: 'Encaja con "centro de mando" y con el TDAH: cero estímulos salvo lo importante. El plan del día es una cinta vertical de horas con la hora actual enmarcada; los hábitos son una lista de comprobación.',
    palette: [['#0b0e10','Panel'],['#e377e0','Magenta: activo'],['#62d3e8','Cian: tus valores'],['#eaa53f','Ámbar: atención'],['#66cf8f','Verde: hecho']],
    type: 'B612 (diseñada por Airbus para pantallas de cabina) + B612 Mono',
    risk: 'Es mi favorita, pero la metáfora puede pasarse a disfraz si no se contiene. B612 es menos familiar. Nativa en oscuro.',
    raises: ['Leyes de color (del arcade): cada color es un significado fijo, nunca decoración.','Lista de comprobación con puntos guía para hábitos y rituales.']
  },
  C: {
    name: 'C · Herramienta precisa',
    thesis: 'El estándar de las herramientas profesionales (Linear, Things) sin guiños: listas agrupadas, bordes sutiles, un solo acento índigo y el formulario con propiedades en fichas.',
    why: 'Es lo que pediste literalmente: sobria tipo Linear. Lo conoces, se aprende solo y funciona.',
    palette: [['#ffffff','Fondo'],['#f7f7f8','Barra lateral'],['#1b1b20','Texto'],['#5058c8','Índigo: acción']],
    type: 'Inter',
    risk: 'Es la opción familiar: Nextuss se parecería mucho a Linear y tendría poca identidad propia.',
    raises: []
  }
};

const ic = n => `<i data-lucide="${n}"></i>`;
const REV = `<svg class="rev" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 1 15 13H1Z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`;

function mockA(view){
  const form = view === 'form', focus = view === 'focus';
  return `
  <nav>
    <div class="brand">NEXTUSS <small class="num">v2</small></div>
    ${[['Hoy','g h',1],['Planificación','g p'],['Hábitos','g b'],['Tareas','g t'],['Proyectos','g r'],['Estadísticas','g e'],['Ajustes','g a']].map(([n,k,on])=>`<a class="${on?'on':''}"><span class="mk"></span>${n}<kbd>${k}</kbd></a>`).join('')}
    <div class="cap">Captura rápida <kbd>i</kbd></div>
  </nav>
  <div class="main ${focus?'dimmed':''}">
    <header>
      <h1>Sábado, 26 de septiembre</h1>
      <div class="tb">
        <div><span>Semana</span><b class="num">39</b></div>
        <div><span>Objetivo</span>Publicar la nueva web · <b class="num">3/5</b></div>
        <div><span>Nivel</span><b class="num">12</b></div>
      </div>
    </header>
    <div class="body">
      <div class="col">
        <h2>Ahora</h2>
        <div class="now">
          <p class="t">Revisar la propuesta del cliente</p>
          <div class="cota"><span class="fill"></span><span class="lab num">45 min</span><span class="l num">10:30</span><span class="r num">11:15</span></div>
          <div class="cells">
            <div><span>Proyecto</span>Lanzamiento web</div>
            <div><span>Prioridad</span>Alta</div>
            <div><span>Energía</span>Media</div>
            <div><span>Objetivo</span>Publicar la nueva web</div>
          </div>
          <div class="acts">
            <button class="btn p">${ic('play')}Empezar foco <kbd>f</kbd></button>
            <button class="btn">${ic('check')}Hecha <kbd>x</kbd></button>
            <button class="btn q">Aplazar</button>
          </div>
        </div>
        <h2>Plan del día</h2>
        <div class="rows">
          <div class="row done"><span class="sq done"></span><span class="time num">09:00</span><span class="tt">Rutina de mañana</span><span class="proj">Hábitos</span><span class="dur num">30 min</span></div>
          <div class="row cur"><span class="sq cur"></span><span class="time num">10:30</span><span class="tt">Revisar la propuesta del cliente</span><span class="proj">Lanzamiento web</span><span class="dur num">45 min</span></div>
          <div class="row nowline"><span class="num">11:02</span></div>
          <div class="row"><span class="sq"></span><span class="time num">12:00</span><span class="tt">Llamada con Marta</span><span class="proj">Lanzamiento web</span><span class="dur num">30 min</span></div>
          <div class="row"><span class="sq"></span><span class="time num">16:00</span><span class="tt">Gimnasio</span><span class="proj">Salud</span><span class="dur num">1 h</span></div>
          <div class="row"><span class="sq park"></span><span class="time num">—</span><span class="tt">Ordenar la carpeta de descargas</span><span class="proj">Casa · aparcada</span><span class="dur num">20 min</span></div>
          <div class="row"><span class="sq"></span><span class="time num">18:30</span><span class="tt">Preparar la semana</span><span class="proj">Ritual</span><span class="dur num">30 min</span></div>
        </div>
      </div>
      <div class="col">
        <div class="blk">
          <div class="hd"><h2>Hábitos</h2><span class="num">2/5</span></div>
          <div class="hab"><span class="sq done"></span><span>Meditar</span><span class="v num">10 min</span><span class="s num">18 d</span></div>
          <div class="hab"><span class="sq"></span><span>Leer</span><span class="v num">6/20 pág</span><span class="s num">4 d</span></div>
          <div class="hab"><span class="sq"></span><span>Beber agua</span><span class="v num">5/8</span><span class="s num">9 d</span></div>
          <div class="hab"><span class="sq done"></span><span>Ejercicio</span><span class="v num">—</span><span class="s num">3 d</span></div>
          <div class="hab"><span class="sq"></span><span>Sin redes antes de las 12</span><span class="v num">—</span><span class="s num">2 d</span></div>
        </div>
        <div class="blk">
          <div class="hd"><h2>Atrasadas</h2><span class="num">3 de 93</span></div>
          <div class="late">${REV}<span>Llamar al dentista</span><span class="num">12 d</span></div>
          <div class="late">${REV}<span>Enviar la factura de agosto</span><span class="num">5 d</span></div>
          <div class="late">${REV}<span>Renovar el seguro del coche</span><span class="num">3 d</span></div>
          <div class="links"><a>Mover todas a mañana</a><a>Aparcar</a><a>Ver las 93</a></div>
        </div>
        <div class="blk">
          <div class="hd"><h2>Progreso</h2><span class="num">2.340 / 3.000 XP</span></div>
          <div class="scale"><div class="bar"><i></i></div>${[0,25,50,75,100].map(p=>`<span class="tk" style="left:calc(${p}% - ${p===100?1:0}px)"></span>`).join('')}</div>
          ${[['Mente',70],['Cuerpo',50],['Trabajo',90],['Hogar',30]].map(([n,v])=>`<div class="attr"><span>${n}</span><span class="b"><i style="width:${v}%"></i></span><span class="num">${v/10}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="scrim"><div class="sheet" role="dialog" aria-label="Nueva tarea">
    <div class="top">${ic('file-plus')}Nueva tarea · Lanzamiento web <kbd>Esc</kbd></div>
    <div class="ttl">Preparar la presentación del viernes<span class="caret"></span></div>
    <div class="notes">Añade notas…</div>
    <div class="cells">
      <div class="focus"><span>Prioridad <kbd>p</kbd></span>Alta</div>
      <div><span>Fecha <kbd>d</kbd></span><b class="num">Lun 28 · 10:00</b></div>
      <div><span>Proyecto <kbd>m</kbd></span>Lanzamiento web</div>
      <div><span>Estimación <kbd>e</kbd></span><b class="num">45 min</b></div>
      <div class="more">${ic('plus')}Más</div>
    </div>
    <div class="foot"><span class="tog"></span>Crear otra<span class="sp"></span><button class="btn q">Cancelar</button><button class="btn p">Crear tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}

function mockB(view){
  const Y = m => 30 + (m - 480) * 0.78; // 08:00 → top
  const hours = [8,9,10,11,12,13,14,15,16,17,18,19];
  const nowY = Y(11*60+2);
  const focus = view === 'focus';
  return `
  <nav>
    <div class="brand">NEXTUSS</div>
    ${[['Hoy','g h',1],['Planificación','g p'],['Hábitos','g b'],['Tareas','g t'],['Proyectos','g r'],['Estadísticas','g e'],['Ajustes','g a']].map(([n,k,on])=>`<a class="${on?'on':''}">${n}<kbd>${k}</kbd></a>`).join('')}
    <div class="foot">Captura rápida <kbd>i</kbd></div>
  </nav>
  <div class="main">
    <div class="ann">
      <span class="date">Sábado 26 sep</span>
      <span class="a">FOCO</span>
      <span class="a lit-green">RITUAL HECHO</span>
      <span class="a lit-amber">${ic('triangle-alert')}93 ATRASADAS</span>
      <span class="clock mono">11:02</span>
    </div>
    <div class="body">
      <div class="tape">
        ${hours.map(h=>`<span class="h mono" style="top:${Y(h*60)}px">${String(h).padStart(2,'0')}:00</span><span class="tick" style="top:${Y(h*60)}px;width:10px"></span><span class="tick" style="top:${Y(h*60+30)}px;width:5px"></span>`).join('')}
        <span class="box mono" style="top:${nowY}px">11:02</span>
      </div>
      <div class="agenda" style="${focus?'':''}">
        <span class="nowline" style="top:${nowY}px"></span>
        <div class="ev done" style="top:${Y(540)-10}px;${focus?'opacity:.3':''}"><span class="tm mono">09:00</span><span class="tt">Rutina de mañana</span><span class="st">HECHO</span></div>
        <div class="ev act" style="top:${Y(630)}px;height:${45*0.78}px"><span class="tm mono">10:30</span><span class="tt">Revisar la propuesta del cliente</span><span class="pj">Lanzamiento web</span></div>
        <div class="active" style="bottom:20px">
          <div class="lab">${ic('navigation')}ACTIVA <span class="mono">10:30 — 11:15 · quedan 13 min</span></div>
          <p class="t">Revisar la propuesta del cliente</p>
          <div class="kv"><span>Proyecto<b>Lanzamiento web</b></span><span>Prioridad<b>Alta</b></span><span>Objetivo<b>Publicar la web</b></span></div>
          <button class="btn p">${ic('play')}Empezar foco <kbd>f</kbd></button>
          <button class="btn">${ic('check')}Hecha <kbd>x</kbd></button>
        </div>
        <div class="ev" style="top:${Y(720)-9}px;${focus?'opacity:.3':''}"><span class="tm mono">12:00</span><span class="tt">Llamada con Marta</span><span class="pj">Lanzamiento web</span></div>
        <div class="ev" style="top:${Y(960)-10}px;${focus?'opacity:.3':''}"><span class="tm mono">16:00</span><span class="tt">Gimnasio</span><span class="pj">Salud</span></div>
        <div class="ev" style="top:${Y(1110)-10}px;${focus?'opacity:.3':''}"><span class="tm mono">18:30</span><span class="tt">Preparar la semana</span><span class="pj">Ritual</span></div>
      </div>
      <div class="side" style="${focus?'opacity:.3':''}">
        <div class="blk">
          <h2><span>HÁBITOS</span><span class="mono">2/5</span></h2>
          <div class="ck"><span>Meditar</span><span class="dots"></span><span class="v ok">HECHO</span></div>
          <div class="ck"><span>Leer</span><span class="dots"></span><span class="v mono">6/20 pág</span></div>
          <div class="ck"><span>Beber agua</span><span class="dots"></span><span class="v mono">5/8</span></div>
          <div class="ck"><span>Ejercicio</span><span class="dots"></span><span class="v ok">HECHO</span></div>
          <div class="ck"><span>Sin redes antes de las 12</span><span class="dots"></span><span class="v mono">—</span></div>
        </div>
        <div class="blk caution">
          <h2><span>ATRASADAS</span><span class="mono">3 de 93</span></h2>
          <div class="r"><span>Llamar al dentista</span><span class="mono">12 d</span></div>
          <div class="r"><span>Enviar la factura de agosto</span><span class="mono">5 d</span></div>
          <div class="r"><span>Renovar el seguro del coche</span><span class="mono">3 d</span></div>
          <div class="links"><button class="btn">Mover a mañana</button><button class="btn">Ver todas</button></div>
        </div>
        <div class="blk">
          <h2><span>PROGRESO</span><span class="mono">2340/3000 XP</span></h2>
          <div class="lvl"><span class="n mono">NV 12</span><span style="color:var(--dim)">próximo nivel en 660 XP</span></div>
          <div class="xp"><i></i><span class="idx"></span></div>
          <div style="height:10px"></div>
          ${[['Mente',70],['Cuerpo',50],['Trabajo',90],['Hogar',30]].map(([n,v])=>`<div class="attr"><span>${n}</span><span class="b"><i style="width:${v}%"></i></span><span class="mono">${v/10}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>
  <div class="scrim"><div class="mcdu" role="dialog" aria-label="Nueva tarea">
    <div class="top">NUEVA TAREA <kbd>Esc</kbd></div>
    <div class="ttl">Preparar la presentación del viernes<span class="caret"></span></div>
    <div class="notes">Añade notas…</div>
    <div class="lines">
      <div class="ln focus"><span class="k">PRIORIDAD</span><span class="v">Alta</span><kbd>p</kbd></div>
      <div class="ln"><span class="k">FECHA</span><span class="v mono">Lun 28 · 10:00</span><kbd>d</kbd></div>
      <div class="ln"><span class="k">PROYECTO</span><span class="v">Lanzamiento web</span><kbd>m</kbd></div>
      <div class="ln"><span class="k">ESTIMACIÓN</span><span class="v mono">45 min</span><kbd>e</kbd></div>
      <div class="ln"><span class="k">MÁS</span><span class="v empty">Energía, etiquetas, objetivo, repetir…</span><kbd>.</kbd></div>
    </div>
    <div class="foot">Crear otra <kbd>Alt ↵</kbd><span class="sp"></span><button class="btn">Cancelar</button><button class="btn p">Crear tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}

function mockC(view, hy){
  const focus = view === 'focus';
  const prio = n => `<span class="prio">${[5,8,11].map((h,i)=>`<i style="height:${h}px" class="${i<n?'':'off'}"></i>`).join('')}</span>`;
  const f = focus ? 'style="opacity:.35"' : '';
  return `
  <nav>
    <div class="ws"><span class="lg">N</span>Nextuss</div>
    <div class="srch">${ic('search')}Buscar<kbd>Ctrl K</kbd></div>
    <a class="on">${ic('sun')}Hoy<kbd>G H</kbd></a>
    <a>${ic('calendar-range')}Planificación<kbd>G P</kbd></a>
    <a>${ic('repeat')}Hábitos<kbd>G B</kbd></a>
    <a>${ic('list-checks')}Tareas<kbd>G T</kbd></a>
    <a>${ic('bar-chart-3')}Estadísticas<kbd>G E</kbd></a>
    <div class="grp">Proyectos</div>
    <a><span class="dot" style="background:#5058c8"></span>Lanzamiento web</a>
    <a><span class="dot" style="background:#2e9e6b"></span>Salud</a>
    <a><span class="dot" style="background:#c9822b"></span>Casa</a>
  </nav>
  <div class="main">
    <header>${ic('sun')}<h1>Hoy</h1><span class="d">Sábado, 26 de septiembre</span><span class="sp"></span><button class="btn">${ic('play')}Foco</button><button class="btn p">${ic('plus')}Nueva tarea <kbd>C</kbd></button></header>
    <div class="body">
      <div class="list">
        ${hy ? `<section class="nowblk">
          <div class="nh"><span class="circ prog"></span>Ahora<span class="meta">quedan 13 min</span></div>
          <p class="nt">Revisar la propuesta del cliente</p>
          <div class="cota"><span class="fill"></span><span class="lab">45 min</span><span class="l">10:30</span><span class="r">11:15</span></div>
          <div class="cells">
            <div><span>Proyecto</span><b><i style="background:#5058c8"></i>Lanzamiento web</b></div>
            <div><span>Prioridad</span><b>${prio(3)}Alta</b></div>
            <div><span>Energía</span><b>Media</b></div>
            <div><span>Objetivo</span><b>Publicar la nueva web</b></div>
          </div>
          <div class="acts"><button class="btn p">${ic('play')}Empezar foco <kbd>F</kbd></button><button class="btn">${ic('check')}Hecha <kbd>X</kbd></button><button class="btn q">Aplazar</button></div>
        </section>` : `<div class="gh">Ahora<span class="c">1</span></div>
        <div class="it sel"><span class="circ prog"></span>${prio(3)}<span class="t">Revisar la propuesta del cliente</span><span class="tag"><i style="background:#5058c8"></i>Lanzamiento web</span><span class="meta">${ic('clock')}10:30 – 11:15</span></div>`}
        <div ${f}>
        <div class="gh">Más tarde<span class="c">3</span></div>
        <div class="it"><span class="circ"></span>${prio(2)}<span class="t">Llamada con Marta</span><span class="tag"><i style="background:#5058c8"></i>Lanzamiento web</span><span class="meta">${ic('clock')}12:00</span></div>
        <div class="it"><span class="circ"></span>${prio(1)}<span class="t">Gimnasio</span><span class="tag"><i style="background:#2e9e6b"></i>Salud</span><span class="meta">${ic('clock')}16:00</span></div>
        <div class="it"><span class="circ"></span>${prio(1)}<span class="t">Preparar la semana</span><span class="meta">${ic('clock')}18:30</span></div>
        <div class="gh">Hábitos<span class="c">2/5</span></div>
        <div class="it done"><span class="circ done"></span><span class="t">Meditar</span><span class="meta">${ic('flame')}18 días</span></div>
        <div class="it"><span class="circ"></span><span class="t">Leer</span><span class="meta">6/20 pág</span></div>
        <div class="it"><span class="circ"></span><span class="t">Beber agua</span><span class="meta">5/8</span></div>
        <div class="gh">Atrasadas<span class="c">93</span><span class="sp"></span><a>Mover todas a mañana</a><a>Ver todas</a></div>
        <div class="it late"><span class="circ"></span>${prio(2)}<span class="t">Llamar al dentista</span><span class="meta">hace 12 días</span></div>
        <div class="it late"><span class="circ"></span>${prio(1)}<span class="t">Enviar la factura de agosto</span><span class="meta">hace 5 días</span></div>
        </div>
      </div>
      <div class="aside" ${f}>
        <h2>Objetivo de la semana</h2>
        <div class="goal"><div class="t">Publicar la nueva web</div><div class="pbar"><i style="width:60%"></i></div><div class="m"><span>3 de 5 tareas</span><span>60 %</span></div></div>
        <h2>Progreso</h2>
        <div class="kv">Nivel 12<span>2.340 / 3.000 XP</span></div>
        <div class="pbar" style="margin-bottom:14px"><i style="width:78%"></i></div>
        ${[['Mente',7],['Cuerpo',5],['Trabajo',9],['Hogar',3]].map(([n,v])=>`<div class="kv">${n}<span>nivel ${v}</span></div>`).join('')}
      </div>
    </div>
  </div>
  <div class="scrim"><div class="modal" role="dialog" aria-label="Nueva tarea">
    <div class="top"><span class="pill"><i style="width:8px;height:8px;border-radius:50%;background:#5058c8;display:inline-block"></i>Lanzamiento web</span>› Nueva tarea<span class="x">${ic('x')}</span></div>
    <div class="ttl">Preparar la presentación del viernes<span class="caret"></span></div>
    <div class="notes">Añade una descripción…</div>
    <div class="props">
      <span class="pc focus">${prio(3)}Alta</span>
      <span class="pc">${ic('calendar')}Lun 28, 10:00</span>
      <span class="pc">${ic('folder')}Lanzamiento web</span>
      <span class="pc">${ic('timer')}45 min</span>
      <span class="pc ghost">${ic('more-horizontal')}</span>
    </div>
    <div class="foot"><span class="sw"></span>Crear más<span class="sp"></span><button class="btn p">Crear tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}


INFO.D = {
  name: 'D · Tablero de salidas',
  thesis: 'El día como el panel de salidas de una estación: filas ordenadas por hora, columnas que nunca se mueven y un estado por fila (hecha, en curso, a tiempo, aparcada). Lo que cambia es solo la ficha, no la estructura.',
  why: 'Responde de un vistazo a "qué toca ahora y qué viene después", que es la pregunta de Hoy. Es la carta competitiva que salió del dado: gana en claridad, pierde algo en calma.',
  palette: [['#0e0e0c','Tablero'],['#1c1c19','Ficha'],['#f3f0e6','Pintura blanca'],['#72d07f','Verde: en curso'],['#f2b632','Ámbar: atraso']],
  type: 'Barlow Condensed (tablero) + Barlow (textos)',
  risk: 'La más llamativa de las cinco: mucho contraste y mayúsculas en cabeceras. Puede cansar en sesiones largas. Nativa en oscuro.',
  raises: ['Títulos de tarea en minúscula normal (no todo en mayúsculas como un tablero real) para que se lean bien.','Modo foco: el resto del tablero se apaga y solo queda la fila en curso.']
};
INFO.E = {
  name: 'E · Aparato Braun',
  thesis: '"Menos, pero mejor" (Dieter Rams): la app como un aparato bien hecho. Módulos con esquinas suaves, teclas redondas para marcar hábitos, un dial para el plan del día. Naranja = la única acción principal de cada pantalla; verde = encendido o hecho.',
  why: 'Transmite calma y orden sin frialdad: tactil, cálido, cero ruido. Las atrasadas van en gris neutro, sin color de alarma, porque el naranja está reservado.',
  palette: [['#dcdad5','Carcasa'],['#eceae6','Panel'],['#232220','Grafito'],['#d4501c','Naranja: acción'],['#2f7d45','Verde: activo']],
  type: 'Hanken Grotesk',
  risk: 'Las sombras suaves y las teclas redondas pueden parecer "de aparato" si se exageran. Nativa en claro.',
  raises: ['Ley de color (del arcade): el naranja aparece una sola vez por pantalla.','Estados por forma (de la tensegridad): tecla vacía, verde con marca, con anillo (ahora) o discontinua (aparcada).']
};
const FILES = { A: 'a-plano-tecnico.html', B: 'b-cabina.html', C: 'c-herramienta.html', D: 'd-tablero.html', E: 'e-aparato.html', F: 'f-herramienta-plano.html', G: 'g-aparato-plano.html' };
const TAGS = { A: 'La que eligió el dado', B: 'Mi favorita', C: 'Lo que pediste: tipo Linear', D: 'Carta competitiva, más atrevida', E: 'Mi segunda candidata', F: 'Mezcla que pediste: C + bloque Ahora de A', G: 'Mezcla que pediste: E + bloque Ahora de A' };

const flaps = t => [...t].map(ch => ch === ':' ? '<span class="c">:</span>' : `<span class="flap">${ch}</span>`).join('');

function mockD(view){
  const row = (cls, t, title, proj, dur, st) => `<div class="br ${cls}"><span class="time">${flaps(t)}</span><span class="cell tt">${title}</span><span class="cell">${proj}</span><span class="cell cn">${dur}</span><span class="cell st">${st}</span></div>`;
  return `
  <nav>
    <div class="brand">NEXTUSS</div>
    ${[['Hoy','g h',1],['Planificación','g p'],['Hábitos','g b'],['Tareas','g t'],['Proyectos','g r'],['Estadísticas','g e'],['Ajustes','g a']].map(([n,k,on])=>`<a class="${on?'on':''}">${n}<kbd>${k}</kbd></a>`).join('')}
    <div class="foot">Captura rápida <kbd>i</kbd></div>
  </nav>
  <div class="main">
    <div class="sign"><h1>Hoy</h1><span class="sub">Sábado, 26 de septiembre · semana 39</span><span class="clock">${flaps('11:02').replace(/class="c"/,'class="sep"')}</span></div>
    <div class="cols">
      <div>
        <div class="board">
          <div class="bh"><span>HORA</span><span>TAREA</span><span>PROYECTO</span><span>DURAC.</span><span>ESTADO</span></div>
          <div class="dimmable">${row('done','09:00','Rutina de mañana','Hábitos','30 MIN','HECHA')}</div>
          ${row('cur','10:30','Revisar la propuesta del cliente','Lanzamiento web','45 MIN','EN CURSO')}
          <div class="dimmable">
          ${row('','12:00','Llamada con Marta','Lanzamiento web','30 MIN','A TIEMPO')}
          ${row('','16:00','Gimnasio','Salud','1 H','A TIEMPO')}
          ${row('','18:30','Preparar la semana','Ritual','30 MIN','A TIEMPO')}
          ${row('park','--:--','Ordenar la carpeta de descargas','Casa','20 MIN','APARCADA')}
          </div>
        </div>
        <div class="now"><span class="t">En curso: <b>Revisar la propuesta del cliente</b> · termina 11:15 · objetivo <b>Publicar la nueva web</b></span><span class="sp"></span>
          <button class="btn p">${ic('play')}Empezar foco <kbd>f</kbd></button><button class="btn">${ic('check')}Hecha <kbd>x</kbd></button></div>
      </div>
      <div class="side dimmable">
        <div class="board mini">
          <div class="bh2"><span>HÁBITOS</span><span class="cn">2/5</span></div>
          ${[['Meditar','HECHO','ok'],['Leer','6/20 PÁG',''],['Beber agua','5/8',''],['Ejercicio','HECHO','ok'],['Sin redes antes de las 12','—','']].map(([n,v,c])=>`<div class="r"><span class="cell">${n}</span><span class="cell v ${c}">${v}</span></div>`).join('')}
        </div>
        <div class="board mini">
          <div class="bh2"><span>RETRASADAS</span><span class="cn">3 DE 93</span></div>
          ${[['Llamar al dentista','12 D'],['Enviar la factura de agosto','5 D'],['Renovar el seguro del coche','3 D']].map(([n,v])=>`<div class="r"><span class="cell">${n}</span><span class="cell v late">+${v}</span></div>`).join('')}
          <div class="links"><button class="btn">Mover todas a mañana</button><button class="btn">Ver las 93</button></div>
        </div>
        <div class="board mini">
          <div class="bh2"><span>PROGRESO</span><span class="cn">2.340 / 3.000 XP</span></div>
          <div class="lvl"><span class="lbl">NIVEL</span>${flaps('12')}<span class="xp">faltan 660 XP</span></div>
          <div class="xpbar">${Array.from({length:20},(_,i)=>`<i class="${i<15?'on':''}"></i>`).join('')}</div>
        </div>
      </div>
    </div>
  </div>
  <div class="scrim"><div class="panel" role="dialog" aria-label="Nueva tarea">
    <div class="top"><span>NUEVA TAREA</span><kbd>Esc</kbd></div>
    <div class="ttl">Preparar la presentación del viernes<span class="caret"></span></div>
    <div class="notes">Añade notas…</div>
    <div class="props">
      <div class="focus"><small>PRIORIDAD · P</small><b>Alta</b></div>
      <div><small>FECHA · D</small><b>Lun 28 · 10:00</b></div>
      <div><small>PROYECTO · M</small><b>Lanzamiento web</b></div>
      <div><small>DURACIÓN · E</small><b>45 min</b></div>
      <div class="more">${ic('plus')}Más</div>
    </div>
    <div class="foot">Crear otra <kbd>Alt ↵</kbd><span class="sp"></span><button class="btn">Cancelar</button><button class="btn p">Crear tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}

function mockE(view, hy){
  const X = m => ((m - 480) / 720 * 100).toFixed(2) + '%';
  return `
  <nav>
    <div class="brand"><span class="led"></span>Nextuss</div>
    ${[['Hoy','G H',1],['Planificación','G P'],['Hábitos','G B'],['Tareas','G T'],['Proyectos','G R'],['Estadísticas','G E'],['Ajustes','G A']].map(([n,k,on])=>`<a class="${on?'on':''}"><span class="dot"></span>${n}<kbd>${k}</kbd></a>`).join('')}
    <div class="foot">Captura rápida <kbd>I</kbd></div>
  </nav>
  <div class="main">
    <div class="mod head"><h1>Hoy</h1><span class="meta">Sábado, 26 de septiembre · objetivo de la semana: Publicar la nueva web (3/5)</span><span class="sp"></span><span class="clock n">11:02</span></div>
    <div class="left">
      ${hy ? `<div class="mod now">
        <h2>Ahora <span class="n">quedan 13 min</span></h2>
        <p class="t">Revisar la propuesta del cliente</p>
        <div class="cota"><span class="fill"></span><span class="lab n">45 min</span><span class="l n">10:30</span><span class="r n">11:15</span></div>
        <div class="cells">
          <div><span>Proyecto</span><b>Lanzamiento web</b></div>
          <div><span>Prioridad</span><b>Alta</b></div>
          <div><span>Energía</span><b>Media</b></div>
          <div><span>Objetivo</span><b>Publicar la nueva web</b></div>
        </div>
        <div class="acts"><button class="btn p">${ic('play')}Empezar foco <kbd>F</kbd></button><button class="btn">${ic('check')}Hecha <kbd>X</kbd></button><button class="btn q">Aplazar</button></div>` : `<div class="mod now">
        <h2>Ahora <span class="n">10:30 – 11:15 · quedan 13 min</span></h2>
        <p class="t">Revisar la propuesta del cliente</p>
        <div class="sub">Lanzamiento web · prioridad alta · energía media</div>
        <div class="acts"><button class="btn p">${ic('play')}Empezar foco <kbd>F</kbd></button><button class="btn">${ic('check')}Hecha <kbd>X</kbd></button><button class="btn q">Aplazar</button></div>
        <div class="dial dimmable">
          <span class="track"></span>
          ${Array.from({length:13},(_,i)=>`<span class="tk" style="left:${(i/12*100).toFixed(2)}%"></span>${i<12?`<span class="tk s" style="left:${((i+.5)/12*100).toFixed(2)}%"></span>`:''}${i%2===0?`<span class="hl n" style="left:${(i/12*100).toFixed(2)}%">${8+i}</span>`:''}`).join('')}
          <span class="ev done" style="left:${X(540)};width:4%"></span>
          <span class="ev cur" style="left:${X(630)};width:6.25%"></span>
          <span class="ev" style="left:${X(720)};width:4%"></span>
          <span class="ev" style="left:${X(960)};width:8.3%"></span>
          <span class="ev" style="left:${X(1110)};width:4%"></span>
          <span class="needle" style="left:${X(662)}"></span>
        </div>
`}
      </div>
      <div class="mod plan dimmable">
        <h2>Plan del día <span class="n">5 bloques</span></h2>
        <div class="it done"><span class="key on"></span><span class="tm n">09:00</span><span class="tt">Rutina de mañana</span><span class="p">Hábitos</span><span class="d n">30 min</span></div>
        <div class="it cur"><span class="key cur"></span><span class="tm n">10:30</span><span class="tt">Revisar la propuesta del cliente</span><span class="p">Lanzamiento web</span><span class="d n">45 min</span></div>
        <div class="it"><span class="key"></span><span class="tm n">12:00</span><span class="tt">Llamada con Marta</span><span class="p">Lanzamiento web</span><span class="d n">30 min</span></div>
        <div class="it"><span class="key"></span><span class="tm n">16:00</span><span class="tt">Gimnasio</span><span class="p">Salud</span><span class="d n">1 h</span></div>
        <div class="it"><span class="key park"></span><span class="tm n">—</span><span class="tt">Ordenar la carpeta de descargas</span><span class="p">Casa · aparcada</span><span class="d n">20 min</span></div>
      </div>
    </div>
    <div class="right dimmable">
      <div class="mod">
        <h2>Hábitos <span class="n">2/5</span></h2>
        ${[['Meditar','18 días',1],['Leer','6/20 pág'],['Beber agua','5/8'],['Ejercicio','3 días',1],['Sin redes antes de las 12','']].map(([n,v,on])=>`<div class="hab"><span class="key ${on?'on':''}"></span><span>${n}</span><span class="v n">${v}</span></div>`).join('')}
      </div>
      <div class="mod">
        <h2>Atrasadas <span class="n">3 de 93</span></h2>
        ${[['Llamar al dentista','12 días'],['Enviar la factura de agosto','5 días'],['Renovar el seguro del coche','3 días']].map(([n,v])=>`<div class="late"><span>${n}</span><span class="n">${v}</span></div>`).join('')}
        <div class="links"><button class="btn">Mover todas a mañana</button><button class="btn q">Ver las 93</button></div>
      </div>
      <div class="mod">
        <h2>Progreso <span class="n">2.340 / 3.000 XP</span></h2>
        <div class="gauge"><span class="big n">12</span><span class="s">nivel · faltan 660 XP</span></div>
        <div class="scale"><i></i></div>
        ${[['Mente',70],['Cuerpo',50],['Trabajo',90],['Hogar',30]].map(([n,v])=>`<div class="attr"><span>${n}</span><span class="b"><i style="width:${v}%"></i></span><span class="n">${v/10}</span></div>`).join('')}
      </div>
    </div>
  </div>
  <div class="scrim"><div class="unit" role="dialog" aria-label="Nueva tarea">
    <div class="top">${ic('circle-plus')}Nueva tarea<span class="sp"></span><kbd>Esc</kbd></div>
    <div class="inner">
      <div class="ttl">Preparar la presentación del viernes<span class="caret"></span></div>
      <div class="notes">Añade notas…</div>
    </div>
    <div class="props">
      <div class="pk focus"><small>Prioridad · P</small><b>Alta</b></div>
      <div class="pk"><small>Fecha · D</small><b class="n">Lun 28 · 10:00</b></div>
      <div class="pk"><small>Proyecto · M</small><b>Lanzamiento web</b></div>
      <div class="pk"><small>Duración · E</small><b class="n">45 min</b></div>
      <div class="pk more">${ic('plus')}Más</div>
    </div>
    <div class="foot"><span class="sw"></span>Crear otra<span class="sp"></span><button class="btn q">Cancelar</button><button class="btn p">Crear tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}

INFO.F = {
  name: 'F · Herramienta precisa + plano',
  thesis: 'La base de C (tipo Linear: listas agrupadas, bordes sutiles, un acento índigo) con el bloque "Ahora" del plano técnico: la línea de medida muestra cuánto dura la tarea y cuánto llevas, y las casillas ponen a la vista proyecto, prioridad, energía y objetivo.',
  why: 'Lo familiar y probado de C, con un momento propio: la tarea actual se lee como una ficha medida, no como una fila más.',
  palette: [['#ffffff','Fondo'],['#f7f7f8','Barra lateral'],['#1b1b20','Texto'],['#5058c8','Índigo: acción y progreso']],
  type: 'Inter',
  risk: 'Sigue pareciéndose mucho a Linear fuera del bloque Ahora.',
  raises: ['Del plano técnico: línea de medida con la duración y casillas de propiedades en el bloque Ahora.']
};
INFO.G = {
  name: 'G · Aparato Braun + plano',
  thesis: 'La base de E ("menos, pero mejor": módulos suaves, teclas redondas, naranja solo para la acción principal) con el bloque "Ahora" del plano técnico: línea de medida y casillas de propiedades hundidas en el panel, como la pantalla de un aparato.',
  why: 'Más identidad propia que F y más cálida. El bloque Ahora encaja como el visor de un aparato Braun.',
  palette: [['#dcdad5','Carcasa'],['#eceae6','Panel'],['#232220','Grafito'],['#d4501c','Naranja: acción'],['#2f7d45','Verde: activo']],
  type: 'Hanken Grotesk',
  risk: 'Las sombras y teclas redondas pueden parecer "de aparato" si se exageran. Nativa en claro.',
  raises: ['Del plano técnico: línea de medida con la duración y casillas de propiedades en el bloque Ahora.','Ley de color: el naranja aparece una sola vez por pantalla.']
};


/* ---------------- Pantallas extra para F (base C) y G (base E) ---------------- */
const TASKS = {
  late: [['Llamar al dentista', 2, 'Casa', '#c9822b', 'hace 12 días', '10 min', ''], ['Enviar la factura de agosto', 1, 'Trabajo', '#5058c8', 'hace 5 días', '15 min', ''], ['Renovar el seguro del coche', 1, 'Casa', '#c9822b', 'hace 3 días', '30 min', '']],
  today: [['Revisar la propuesta del cliente', 3, 'Lanzamiento web', '#5058c8', '10:30', '45 min', '2/5'], ['Llamada con Marta', 2, 'Lanzamiento web', '#5058c8', '12:00', '30 min', ''], ['Gimnasio', 1, 'Salud', '#2e9e6b', '16:00', '1 h', ''], ['Preparar la semana', 1, 'Ritual', '#6a6a75', '18:30', '30 min', '']],
  tomorrow: [['Preparar la presentación del viernes', 3, 'Lanzamiento web', '#5058c8', 'Lun 10:00', '45 min', '0/3'], ['Comprar regalo de cumpleaños', 1, 'Casa', '#c9822b', 'Lun', '20 min', '']],
  week: [['Escribir el texto de la portada', 2, 'Lanzamiento web', '#5058c8', 'Mié', '1 h', ''], ['Pedir cita en el fisio', 1, 'Salud', '#2e9e6b', 'Jue', '5 min', ''], ['Revisar gastos del mes', 2, 'Casa', '#c9822b', 'Vie', '30 min', '']]
};
const HABITS = [
  ['brain', 'Meditar', 'Duración · 10 min', 'Todos los días', [1,1,1,1,1,1,0], 18, 1],
  ['book-open', 'Leer', 'Cantidad · 20 páginas', 'Todos los días', [1,1,0,1,1,0,0], 4, 0],
  ['glass-water', 'Beber agua', 'Cantidad · 8 vasos', 'Todos los días', [1,1,1,1,1,1,0], 9, 0],
  ['dumbbell', 'Ejercicio', 'Sí / no', 'L · X · V · S', [1,-1,1,-1,1,1,-1], 3, 1],
  ['smartphone', 'Sin redes antes de las 12', 'Evitar', 'Todos los días', [1,0,1,1,1,1,0], 2, 0]
];
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const NAV_ITEMS = [['sun','Hoy','G H','today'],['calendar-range','Planificación','G P'],['repeat','Hábitos','G B','habits'],['list-checks','Tareas','G T','tasks'],['folder','Proyectos','G R'],['bar-chart-3','Estadísticas','G E']];

function navC(active){
  return `<nav>
    <div class="ws"><span class="lg">N</span>Nextuss</div>
    <div class="srch">${ic('search')}Buscar<kbd>Ctrl K</kbd></div>
    ${NAV_ITEMS.map(([i,n,k,v])=>`<a class="${v===active?'on':''}">${ic(i)}${n}<kbd>${k}</kbd></a>`).join('')}
    <div class="grp">Proyectos</div>
    <a><span class="dot" style="background:#5058c8"></span>Lanzamiento web</a>
    <a><span class="dot" style="background:#2e9e6b"></span>Salud</a>
    <a><span class="dot" style="background:#c9822b"></span>Casa</a>
  </nav>`;
}
function navE(active){
  return `<nav>
    <div class="brand"><span class="led"></span>Nextuss</div>
    ${NAV_ITEMS.map(([i,n,k,v])=>`<a class="${v===active?'on':''}"><span class="dot"></span>${n}<kbd>${k}</kbd></a>`).join('')}
    <div class="foot">Captura rápida <kbd>I</kbd></div>
  </nav>`;
}
const prioC = n => `<span class="prio">${[5,8,11].map((h,i)=>`<i style="height:${h}px" class="${i<n?'':'off'}"></i>`).join('')}</span>`;

/* ---------- F: Tareas ---------- */
function tasksC(){
  const row = ([t,p,proj,col,when,est,sub], cls='') => `<div class="it ${cls}"><span class="circ"></span>${prioC(p)}<span class="t">${t}</span>${sub?`<span class="meta">${ic('list-tree')}${sub}</span>`:''}<span class="tag"><i style="background:${col}"></i>${proj}</span><span class="meta w">${when}</span><span class="meta e">${est}</span></div>`;
  const grp = (n, c, extra='') => `<div class="gh">${n}<span class="c">${c}</span><span class="sp"></span>${extra}</div>`;
  return `${navC('tasks')}
  <div class="main">
    <header>${ic('list-checks')}<h1>Tareas</h1><span class="d">32 abiertas</span><span class="sp"></span><button class="btn">${ic('sliders-horizontal')}Filtros</button><button class="btn p">${ic('plus')}Nueva tarea <kbd>C</kbd></button></header>
    <div class="tabs"><a class="on">Todas</a><a>Hoy</a><a>Próximas</a><a>Aparcadas</a><a class="add">${ic('plus')}Vista</a></div>
    <div class="list tl">
      ${grp('Atrasadas', 93, '<a>Mover todas a mañana</a><a>Aparcar</a>')}
      ${TASKS.late.map(r=>row(r,'late')).join('')}
      <div class="more-row">Ver las 90 restantes</div>
      ${grp('Hoy', 4)}
      ${TASKS.today.map((r,i)=>row(r, i===0?'sel':'')).join('')}
      ${grp('Mañana', 2)}
      ${TASKS.tomorrow.map(r=>row(r)).join('')}
      ${grp('Esta semana', 3)}
      ${TASKS.week.map(r=>row(r)).join('')}
    </div>
    <div class="kbar"><span><kbd>J</kbd><kbd>K</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>X</kbd> hecha</span><span><kbd>[</kbd><kbd>]</kbd> mover fecha</span><span><kbd>T</kbd> hoy</span></div>
  </div>`;
}
/* ---------- F: Hábitos ---------- */
function habitsC(){
  const week = w => `<span class="wk">${w.map((d,i)=>`<span class="wd ${d===1?'on':d===-1?'off':''} ${i===5?'today':''}" title="${DAYS[i]}">${DAYS[i]}</span>`).join('')}</span>`;
  return `${navC('habits')}
  <div class="main">
    <header>${ic('repeat')}<h1>Hábitos</h1><span class="d">2 de 5 hoy</span><span class="sp"></span><button class="btn">${ic('archive')}Archivados</button><button class="btn p">${ic('plus')}Nuevo hábito <kbd>H</kbd></button></header>
    <div class="list hl">
      <div class="gh">Esta semana<span class="c">22 de 31 marcas</span></div>
      ${HABITS.map(([i,n,type,freq,w,streak,done])=>`<div class="hrow"><span class="circ ${done?'done':''}"></span><span class="hi">${ic(i)}</span><span class="hn">${n}<small>${type} · ${freq}</small></span>${week(w)}<span class="meta">${ic('flame')}${streak} días</span></div>`).join('')}
      <div class="gh">Mejor racha<span class="c"></span></div>
      <div class="best"><span>Meditar · <b>42 días</b> (marzo–abril)</span><span>Beber agua · <b>31 días</b></span><span>Leer · <b>19 días</b></span></div>
    </div>
  </div>`;
}
/* ---------- F: Tarea completa ---------- */
function formFullC(){
  return `<div class="scrim tall"><div class="modal full" role="dialog" aria-label="Editar tarea">
    <div class="top"><span class="pill"><i style="width:8px;height:8px;border-radius:50%;background:#5058c8;display:inline-block"></i>Lanzamiento web</span>› Preparar la presentación del viernes<span class="x">${ic('x')}</span></div>
    <div class="ttl">Preparar la presentación del viernes</div>
    <div class="notes on">Diapositivas con el resumen del lanzamiento y las fechas clave.</div>
    <div class="props">
      <span class="pc">${prioC(3)}Alta</span>
      <span class="pc">${ic('calendar')}Lun 28, 10:00</span>
      <span class="pc">${ic('folder')}Lanzamiento web</span>
      <span class="pc">${ic('timer')}45 min</span>
    </div>
    <div class="more">
      <div class="fr"><span class="fl">${ic('zap')}Energía</span><span class="segc"><span>Baja</span><span class="on">Media</span><span>Alta</span></span></div>
      <div class="fr"><span class="fl">${ic('tag')}Etiquetas</span><span class="tags"><span class="tg">reunión</span><span class="tg">cliente</span><span class="tg add">${ic('plus')}Añadir</span></span></div>
      <div class="fr"><span class="fl">${ic('target')}Objetivo</span><span class="selbox">Publicar la nueva web ${ic('chevron-down')}</span></div>
      <div class="fr"><span class="fl">${ic('repeat')}Repetir</span><span class="sw"></span><span class="hint">No se repite</span></div>
      <div class="fr top"><span class="fl">${ic('list-tree')}Subtareas <b>1/3</b></span>
        <span class="subs">
          <span class="sb done"><span class="circ done"></span>Reunir las cifras del trimestre</span>
          <span class="sb"><span class="circ"></span>Montar las diapositivas</span>
          <span class="sb"><span class="circ"></span>Ensayar en voz alta</span>
          <span class="sb add">${ic('plus')}Añadir subtarea</span>
        </span></div>
    </div>
    <div class="foot"><button class="btn ghostdanger">${ic('trash-2')}Eliminar</button><span class="sp"></span><span>Guardado automático</span><button class="btn">Cancelar</button><button class="btn p">Guardar tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}

/* ---------- G: Tareas ---------- */
function tasksE(){
  const row = ([t,p,proj,col,when,est,sub], cls='') => `<div class="tr ${cls}"><span class="key ${cls==='cur'?'cur':''}"></span><span class="tt">${t}${sub?` <small>${sub}</small>`:''}</span><span class="p">${proj}</span><span class="pr">${['','Baja','Media','Alta'][p]}</span><span class="w n">${when}</span><span class="d n">${est}</span></div>`;
  return `${navE('tasks')}
  <div class="main one">
    <div class="mod head"><h1>Tareas</h1><span class="meta">32 abiertas</span><span class="segE"><span class="on">Todas</span><span>Hoy</span><span>Próximas</span><span>Aparcadas</span></span><span class="sp"></span><button class="btn">${ic('sliders-horizontal')}Filtros</button><button class="btn p">${ic('plus')}Nueva tarea <kbd>C</kbd></button></div>
    <div class="cols2">
      <div class="mod tl">
        <h2>Atrasadas <span class="n">3 de 93 · <a>Mover todas a mañana</a> · <a>Ver todas</a></span></h2>
        ${TASKS.late.map(r=>row([r[0],r[1],r[2],r[3],r[4].replace('hace ',''),r[5],r[6]],'late')).join('')}
        <h2 class="sp2">Hoy <span class="n">4</span></h2>
        ${TASKS.today.map((r,i)=>row(r, i===0?'cur':'')).join('')}
      </div>
      <div class="mod tl">
        <h2>Mañana <span class="n">2</span></h2>
        ${TASKS.tomorrow.map(r=>row(r)).join('')}
        <h2 class="sp2">Esta semana <span class="n">3</span></h2>
        ${TASKS.week.map(r=>row(r)).join('')}
        <div class="kbar"><span><kbd>J</kbd><kbd>K</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>X</kbd> hecha</span><span><kbd>[</kbd><kbd>]</kbd> fecha</span></div>
      </div>
    </div>
  </div>`;
}
/* ---------- G: Hábitos ---------- */
function habitsE(){
  return `${navE('habits')}
  <div class="main one">
    <div class="mod head"><h1>Hábitos</h1><span class="meta">2 de 5 hoy · 22 de 31 marcas esta semana</span><span class="sp"></span><button class="btn">${ic('archive')}Archivados</button><button class="btn p">${ic('plus')}Nuevo hábito <kbd>H</kbd></button></div>
    <div class="mod hl">
      <div class="hhead"><span></span><span></span>${DAYS.map((d,i)=>`<span class="dh ${i===5?'today':''}">${d}</span>`).join('')}<span class="dh r">Racha</span></div>
      ${HABITS.map(([i,n,type,freq,w,streak,done])=>`<div class="hrowE"><span class="hic">${ic(i)}</span><span class="hn">${n}<small>${type} · ${freq}</small></span>${w.map((d,k)=>`<span class="key ${d===1?'on':''} ${d===-1?'rest':''} ${k===5?'todayk':''}"></span>`).join('')}<span class="st n">${streak} días</span></div>`).join('')}
    </div>
    <div class="mod best"><h2>Mejores rachas</h2><div class="bests"><span><b class="n">42</b> días · Meditar</span><span><b class="n">31</b> días · Beber agua</span><span><b class="n">19</b> días · Leer</span></div></div>
  </div>`;
}
/* ---------- G: Tarea completa ---------- */
function formFullE(){
  return `<div class="scrim tall"><div class="unit full" role="dialog" aria-label="Editar tarea">
    <div class="top">${ic('pencil')}Editar tarea<span class="sp"></span><kbd>Esc</kbd></div>
    <div class="inner">
      <div class="ttl">Preparar la presentación del viernes</div>
      <div class="notes on">Diapositivas con el resumen del lanzamiento y las fechas clave.</div>
    </div>
    <div class="props">
      <div class="pk"><small>Prioridad · P</small><b>Alta</b></div>
      <div class="pk"><small>Fecha · D</small><b class="n">Lun 28 · 10:00</b></div>
      <div class="pk"><small>Proyecto · M</small><b>Lanzamiento web</b></div>
      <div class="pk"><small>Duración · E</small><b class="n">45 min</b></div>
    </div>
    <div class="moreE">
      <div class="fr"><span class="fl">Energía</span><span class="segE"><span>Baja</span><span class="on">Media</span><span>Alta</span></span></div>
      <div class="fr"><span class="fl">Etiquetas</span><span class="tags"><span class="tg">reunión</span><span class="tg">cliente</span><span class="tg add">${ic('plus')}Añadir</span></span></div>
      <div class="fr"><span class="fl">Objetivo</span><span class="selbox">Publicar la nueva web ${ic('chevron-down')}</span></div>
      <div class="fr"><span class="fl">Repetir</span><span class="sw"></span><span class="hint">No se repite</span></div>
      <div class="fr top"><span class="fl">Subtareas <b class="n">1/3</b></span>
        <span class="subs">
          <span class="sb done"><span class="key on"></span>Reunir las cifras del trimestre</span>
          <span class="sb"><span class="key"></span>Montar las diapositivas</span>
          <span class="sb"><span class="key"></span>Ensayar en voz alta</span>
          <span class="sb add">${ic('plus')}Añadir subtarea</span>
        </span></div>
    </div>
    <div class="foot"><button class="btn q">${ic('trash-2')}Eliminar</button><span class="sp"></span><span>Guardado automático</span><button class="btn">Cancelar</button><button class="btn p">Guardar tarea <kbd>Ctrl ↵</kbd></button></div>
  </div></div>`;
}

function fgScreen(base, view){
  if (view === 'tasks') return base === 'C' ? tasksC() : tasksE();
  if (view === 'habits') return base === 'C' ? habitsC() : habitsE();
  const today = base === 'C' ? mockC('form', true) : mockE('form', true);
  return today.slice(0, today.lastIndexOf('<div class="scrim">')) + (base === 'C' ? formFullC() : formFullE());
}
const EXTRA_VIEWS = ['tasks', 'habits', 'formfull'];

/* ------------------------------ montaje ------------------------------ */
const MOCKS = { A: mockA, B: mockB, C: mockC, D: mockD, E: mockE, F: v => EXTRA_VIEWS.includes(v) ? fgScreen('C', v) : mockC(v, true), G: v => EXTRA_VIEWS.includes(v) ? fgScreen('E', v) : mockE(v, true) };
const NATIVE = { A: 'light', B: 'dark', C: 'light', D: 'dark', E: 'light', F: 'light', G: 'light' };
const ORDER = ['F', 'G', 'A', 'B', 'C', 'D', 'E'];

function mockHTML(dir, theme, view){
  const base = { F: 'C', G: 'E' }[dir] || dir;
  return `<div class="m d${base} ${view === 'form' || view === 'formfull' ? 'form-open' : ''} ${view === 'focus' ? 'view-focus' : ''}" data-theme="${theme}">${MOCKS[dir](view)}</div>`;
}
function scaleTo(box, stage, w, h){
  const s = Math.min(w / 1280, h / 800);
  stage.style.transform = `scale(${s})`;
  box.style.width = 1280 * s + 'px';
  box.style.height = 800 * s + 'px';
}
const load = (k, d) => { try { return localStorage.getItem(k) || d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

function gallery(){
  const root = document.getElementById('app');
  root.innerHTML = `<main class="pg">
    <h1>Nextuss · direcciones visuales</h1>
    <p class="lead">Arriba, las dos mezclas que pediste; debajo, las 5 originales. Todas sobrias, con el mismo contenido de ejemplo (datos inventados). Abre cada una a pantalla completa: dentro puedes cambiar entre claro y oscuro, abrir el formulario de nueva tarea y probar el modo foco.</p>
    <div class="grid">${ORDER.map(d => `
      <article class="card">
        <div class="thumb" data-thumb="${d}"><div class="stage">${mockHTML(d, NATIVE[d], 'today')}</div></div>
        <div class="tx"><h2>${INFO[d].name}</h2><span class="tag">${TAGS[d]}</span><p>${INFO[d].thesis}</p>
        <span class="chips">${INFO[d].palette.map(([c,n])=>`<span class="chip"><i style="background:${c}"></i>${n}</span>`).join('')}</span>
        <a class="go" href="${FILES[d]}">Ver a pantalla completa →</a></div>
      </article>`).join('')}
    </div>
    <section class="others">
      <h3>Otras cartas que salieron (no desarrolladas; se pueden pedir)</h3>
      <ul>
        <li><b>Pared de streaming</b>: aporta el modo foco (la fila activa se destaca y el resto se apaga). Incluido en A, D y E.</li>
        <li><b>Columna de tensegridad</b>: aporta estados distintos por forma, no solo por color. Incluido en A y E.</li>
        <li><b>Cajas de zapatillas</b>: aporta una rejilla fija de etiqueta en cada fila. Incluido en A.</li>
        <li><b>Pantalla arcade</b>: aporta "leyes de color": cada color significa una sola cosa. Incluido en A, B y E.</li>
        <li><b>Identidad Studio Dumbar</b>: demasiado ruidosa para una voz sobria.</li>
      </ul>
    </section>
  </main>`;
  const fit = () => document.querySelectorAll('[data-thumb]').forEach(t => {
    const w = t.clientWidth, s = w / 1280; t.firstElementChild.style.transform = `scale(${s})`; t.style.height = 800 * s + 'px';
  });
  if (window.lucide) lucide.createIcons();
  fit(); addEventListener('resize', fit);
}

function viewer(dir){
  const i = INFO[dir], idx = ORDER.indexOf(dir);
  const prev = ORDER[(idx + ORDER.length - 1) % ORDER.length], next = ORDER[(idx + 1) % ORDER.length];
  const views = ['F', 'G'].includes(dir)
    ? [['today','Hoy'],['form','Nueva tarea'],['formfull','Tarea completa'],['tasks','Tareas'],['habits','Hábitos'],['focus','Modo foco']]
    : [['today','Hoy'],['form','Nueva tarea'],['focus','Modo foco']];
  const st = { theme: load('nx-dir-theme-' + dir, NATIVE[dir]), view: load('nx-dir-view', 'today') };
  if (!views.some(([v]) => v === st.view)) st.view = 'today';
  document.title = i.name.replace(/^. · /, '');
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="bar">
      <a class="back" href="index.html">← Todas</a>
      <h1>${i.name}</h1>
      <div class="seg" role="group" aria-label="Tema"><button data-theme-btn="light">Claro</button><button data-theme-btn="dark">Oscuro</button></div>
      <div class="seg" role="group" aria-label="Vista">${views.map(([v,n])=>`<button data-view="${v}">${n}</button>`).join('')}</div>
      <span class="sp"></span>
      <span class="nav"><a href="${FILES[prev]}">← ${INFO[prev].name}</a><a href="${FILES[next]}">${INFO[next].name} →</a></span>
    </div>
    <div class="frame" id="frame"><div class="stage" id="stage"></div></div>
    <section class="info">
      <div><p>${i.thesis}</p><p class="dim">${i.why}</p>
        ${i.raises.length ? `<p style="margin:12px 0 0;font-weight:600;font-size:14px">Ideas incorporadas de otras cartas</p><ul>${i.raises.map(r=>`<li>${r}</li>`).join('')}</ul>` : ''}</div>
      <dl>
        <dt>Paleta</dt><dd class="chips">${i.palette.map(([c,n])=>`<span class="chip"><i style="background:${c}"></i>${n}</span>`).join('')}</dd>
        <dt>Letra</dt><dd>${i.type}</dd>
        <dt>Riesgo</dt><dd>${i.risk}</dd>
      </dl>
    </section>`;
  const frame = document.getElementById('frame'), stage = document.getElementById('stage');
  const fit = () => scaleTo(frame, stage, Math.min(innerWidth - 32, 1600), Math.max(320, innerHeight - document.querySelector('.bar').offsetHeight - 32));
  const render = () => {
    stage.innerHTML = mockHTML(dir, st.theme, st.view);
    root.querySelectorAll('[data-theme-btn]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeBtn === st.theme));
    root.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === st.view));
    if (window.lucide) lucide.createIcons();
    fit();
    save('nx-dir-theme-' + dir, st.theme); save('nx-dir-view', st.view);
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.themeBtn) st.theme = b.dataset.themeBtn; else if (b.dataset.view) st.view = b.dataset.view; else return;
    render();
  });
  addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') location.href = FILES[next];
    if (e.key === 'ArrowLeft') location.href = FILES[prev];
  });
  addEventListener('resize', fit);
  render();
}

const DIR = document.body.dataset.dir;
DIR ? viewer(DIR) : gallery();
