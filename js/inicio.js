// Portada de Behind the Track:
//  1) rueda de álbumes que se reparte, se levanta y gira sola
//  2) tarjetas 3D de los artistas destacados
// Los datos salen de js/catalogo.js (hay que cargarlo antes que este archivo).

(function () {
  'use strict';

  const raiz = document.documentElement;
  const rueda = document.getElementById('rueda');
  const escena = document.getElementById('escena');
  const textoCarga = document.getElementById('carga');
  const avanceCarga = document.getElementById('carga-texto');   // solo lo leen los lectores de pantalla
  const botonSaltar = document.getElementById('saltar');
  const contenedorTarjetas = document.getElementById('tarjetas');
  const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Números que controlan la rueda ----------
  const TOTAL_CARTAS = 24;        // cada álbum sale 2 veces, pero siempre en lados opuestos
  const LADO = 190;               // lado de la carta antes de crecer (px)
  const RADIO_INICIO = 620;       // radio de la rueda mientras se reparte
  const RADIO_FINAL = 1100;       // radio cuando ya se levantó
  const PIVOTE_INICIO = 870;      // qué tan abajo del centro está el eje de giro
  const PIVOTE_FINAL = 1250;
  const GIRO_LEVANTE = 28;        // grados que gira a la izquierda al abrirse
  const DERIVA = 7;               // grados por segundo que gira sola
  const DURACION_REPARTO = 2400;  // ms
  const DURACION_LEVANTE = 1900;  // ms

  // ---------- Utilidades ----------
  const limitar = (n, min, max) => Math.min(max, Math.max(min, n));
  const mezclar = (a, b, t) => a + (b - a) * t;
  const suave = (t) => 1 - Math.pow(1 - t, 3);          // easeOutCubic
  const envolver = (grados) => ((grados + 180) % 360 + 360) % 360 - 180;   // deja el ángulo entre -180 y 180

  // Curva cubic-bezier para el levante (la misma de CSS: .5, 0, .15, 1)
  function crearCurva(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const x = (t) => ((ax * t + bx) * t + cx) * t;
    const y = (t) => ((ay * t + by) * t + cy) * t;
    const derivada = (t) => (3 * ax * t + 2 * bx) * t + cx;

    return function (progreso) {
      let t = progreso;
      for (let i = 0; i < 8; i++) {          // método de Newton
        const error = x(t) - progreso;
        const pendiente = derivada(t);
        if (Math.abs(error) < 0.00001 || Math.abs(pendiente) < 0.000001) break;
        t -= error / pendiente;
      }
      return y(limitar(t, 0, 1));
    };
  }
  const curvaLevante = crearCurva(0.5, 0, 0.15, 1);

  // Para meter texto de la API dentro de innerHTML sin riesgos
  function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  // Si la API no dio enlace, mandamos a la búsqueda de Apple Music
  function enlaceDe(item) {
    if (item.enlace && item.enlace.startsWith('https://')) return item.enlace;
    return 'https://music.apple.com/search?term=' + encodeURIComponent(item.artista + ' ' + (item.album || ''));
  }

  const colores = (item) => '--c1:' + item.colores[0] + ';--c2:' + item.colores[1];

  // ---------- Estado de la animación ----------
  const estado = {
    reparto: 0,        // 0 a 1: las cartas se van repartiendo
    levante: 0,        // 0 a 1: la rueda se abre y crece
    objetivo: 0,       // ángulo al que quiere llegar la rueda
    visible: 0,        // ángulo que se está dibujando (va persiguiendo al objetivo)
    velocidad: 0,      // grados por segundo después de soltar el arrastre
    arrastrando: false,
    listo: false       // true cuando ya terminó la intro
  };

  let fase = 'cargando';         // cargando -> reparto -> levante -> listo
  let inicioFase = 0;
  let textoMostrado = false;
  let omitir = sinMovimiento;
  let liberarOmision = null;
  let cartas = [];
  const medidas = { k: 1, pxPorGrado: 1 };

  // ---------- Construcción de la rueda ----------
  function crearCartaRueda(item) {
    const titulo = item.album || item.artista;
    const imagen = item.portada
      ? '<img src="' + escapar(item.portada) + '" alt="" width="190" height="190" draggable="false">'
      : '';

    return (
      '<a href="' + escapar(enlaceDe(item)) + '" target="_blank" rel="noopener" draggable="false"' +
      ' aria-label="' + escapar(titulo + ', de ' + item.artista) + '">' +
        '<span class="carta__cara carta__cara--frente" style="' + colores(item) + '">' +
          imagen +
          '<span class="carta__pie"><strong>' + escapar(titulo) + '</strong><small>' + escapar(item.artista) + '</small></span>' +
        '</span>' +
        '<span class="carta__cara carta__cara--dorso" aria-hidden="true">B</span>' +
      '</a>'
    );
  }

  function construirRueda(items) {
    escena.textContent = '';
    cartas = [];

    for (let i = 0; i < TOTAL_CARTAS; i++) {
      const li = document.createElement('li');
      li.className = 'carta';
      li.innerHTML = crearCartaRueda(items[i % items.length]);
      escena.appendChild(li);

      const base = (i * 360) / TOTAL_CARTAS;          // ángulo "de casa" de la carta (0 = arriba)
      cartas.push({
        el: li,
        base: base,
        // La del centro se reparte primero y el reparto se abre hacia los lados
        orden: limitar(Math.abs(envolver(base)) / 100, 0, 1),
        transform: '',
        visibilidad: ''
      });
    }
  }

  // Mide el contenedor y escala todo según el ancho de la pantalla
  function medir() {
    const caja = rueda.getBoundingClientRect();
    const minimo = caja.width < 720 ? 0.62 : 0.5;      // en el celular las cartas no pueden quedar diminutas
    const k = limitar(Math.min(caja.width / 1440, caja.height / 800), minimo, 1);
    medidas.k = k;
    medidas.pxPorGrado = (RADIO_FINAL * k * Math.PI) / 180;
    rueda.style.setProperty('--lado', LADO * k + 'px');
    cartas.forEach((c) => { c.transform = ''; });      // fuerza a reescribir las cartas
  }

  // ---------- Pose de una carta ----------
  // Un solo transform por carta, siempre en este orden:
  // ir al eje -> girar alrededor -> alejarse del eje -> voltear -> escalar
  function posar(carta) {
    const k = medidas.k;
    const lev = estado.levante;

    const giro = estado.visible - GIRO_LEVANTE * lev;
    const angulo = envolver(carta.base + giro);
    const distancia = Math.abs(angulo);                      // qué tan lejos está de la parte de arriba

    // Cada carta tiene su propio tramo del reparto
    const p = suave(limitar((estado.reparto - carta.orden * 0.6) / 0.4, 0, 1));

    const anguloReparto = angulo + 70 * (1 - p);              // llega desde 70° a la derecha
    const radio = mezclar(RADIO_INICIO, RADIO_FINAL, lev) * k * p;
    const pivote = (mezclar(PIVOTE_INICIO, PIVOTE_FINAL, lev) + 140 * (1 - p)) * k;
    const profundidad = -distancia * 1.5;                     // la de arriba queda sobre las vecinas
    const volteo = 180 * (1 - p);                             // se voltea mientras llega
    const escala = (1 + 0.35 * lev) * (0.7 + 0.3 * p);

    const transform =
      'translate3d(0,' + pivote.toFixed(1) + 'px,' + profundidad.toFixed(1) + 'px) ' +
      'rotateZ(' + anguloReparto.toFixed(2) + 'deg) ' +
      'translate3d(0,' + (-radio).toFixed(1) + 'px,0) ' +
      'rotateY(' + volteo.toFixed(1) + 'deg) ' +
      'scale(' + escala.toFixed(3) + ')';

    // Solo se ven las cartas cerca de la parte de arriba; el resto se esconde
    const visibilidad = p > 0 && distancia < 100 ? 'visible' : 'hidden';

    // Solo escribo en el DOM si algo cambió
    if (transform !== carta.transform) {
      carta.el.style.transform = transform;
      carta.transform = transform;
    }
    if (visibilidad !== carta.visibilidad) {
      carta.el.style.visibility = visibilidad;
      carta.visibilidad = visibilidad;
    }
  }

  let escenaAnterior = '';
  function posarEscena() {
    const lev = estado.levante;
    const texto = 'rotateX(' + (12 * lev).toFixed(2) + 'deg) scale(' + (1 + 0.14 * lev).toFixed(3) + ')';
    if (texto !== escenaAnterior) {
      escena.style.transform = texto;
      escenaAnterior = texto;
    }
  }

  // ---------- Intro (reparto y levante) ----------
  function mostrarTexto() {
    if (textoMostrado) return;
    textoMostrado = true;
    raiz.classList.add('texto-visible');
    textoCarga.hidden = true;
  }

  function terminarIntro() {
    fase = 'listo';
    estado.reparto = 1;
    estado.levante = 1;
    estado.listo = true;
    mostrarTexto();
    botonSaltar.hidden = true;
    textoCarga.hidden = true;
  }

  function avanzarIntro(ahora) {
    if (fase === 'reparto') {
      estado.reparto = limitar((ahora - inicioFase) / DURACION_REPARTO, 0, 1);
      if (estado.reparto >= 1) {
        fase = 'levante';
        inicioFase = ahora;
        textoCarga.hidden = true;
      }
    } else if (fase === 'levante') {
      const t = limitar((ahora - inicioFase) / DURACION_LEVANTE, 0, 1);
      estado.levante = curvaLevante(t);
      if (ahora - inicioFase > 1000) mostrarTexto();      // el texto entra con la rueda todavía moviéndose
      if (t >= 1) terminarIntro();
    }
  }

  // ---------- Bucle principal (uno solo para todas las cartas) ----------
  let ultimoCuadro = performance.now();

  function cuadro(ahora) {
    const dt = Math.min((ahora - ultimoCuadro) / 1000, 0.05);
    ultimoCuadro = ahora;

    avanzarIntro(ahora);

    if (estado.listo && !estado.arrastrando) {
      // La inercia del arrastre se va apagando sola
      estado.objetivo += estado.velocidad * dt;
      estado.velocidad *= Math.exp(-dt * 3.2);
      // Deriva lenta hacia la izquierda (mismo lado que el giro del levante)
      if (!sinMovimiento) estado.objetivo -= DERIVA * dt * estado.levante;
    }

    // El ángulo que se ve persigue al objetivo con suavidad
    estado.visible += (estado.objetivo - estado.visible) * (1 - Math.exp(-dt * 9));

    posarEscena();
    cartas.forEach(posar);
    requestAnimationFrame(cuadro);
  }

  // ---------- Arrastre, rueda del mouse y teclado ----------
  let arrastre = null;
  let huboArrastre = false;

  rueda.addEventListener('pointerdown', (e) => {
    if (!estado.listo || e.button > 0) return;
    arrastre = { x: e.clientX, ultimoX: e.clientX, ultimoT: performance.now(), v: 0, movido: false };
    huboArrastre = false;
    estado.velocidad = 0;
  });

  rueda.addEventListener('pointermove', (e) => {
    if (!arrastre) return;

    if (!arrastre.movido) {
      if (Math.abs(e.clientX - arrastre.x) < 6) return;     // todavía puede ser un clic
      arrastre.movido = true;
      huboArrastre = true;
      estado.arrastrando = true;
      rueda.setPointerCapture(e.pointerId);
    }

    const ahora = performance.now();
    const grados = (e.clientX - arrastre.ultimoX) / medidas.pxPorGrado;
    const segundos = Math.max((ahora - arrastre.ultimoT) / 1000, 0.001);

    estado.objetivo += grados;
    arrastre.v = mezclar(arrastre.v, grados / segundos, 0.5);
    arrastre.ultimoX = e.clientX;
    arrastre.ultimoT = ahora;
  });

  function soltar() {
    if (!arrastre) return;
    if (arrastre.movido) {
      // Si se quedó quieto más de 80 ms antes de soltar, no hay empujón
      const pausa = performance.now() - arrastre.ultimoT;
      estado.velocidad = pausa > 80 ? 0 : limitar(arrastre.v, -400, 400);
    }
    estado.arrastrando = false;
    arrastre = null;
  }
  rueda.addEventListener('pointerup', soltar);
  rueda.addEventListener('pointercancel', soltar);

  // Si arrastró, no debe abrirse el enlace de la carta
  rueda.addEventListener('click', (e) => {
    if (huboArrastre) {
      e.preventDefault();
      e.stopPropagation();
      huboArrastre = false;
    }
  }, true);

  // Solo reacciona al desplazamiento horizontal; el vertical sigue moviendo la página
  rueda.addEventListener('wheel', (e) => {
    if (!estado.listo || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    estado.objetivo -= e.deltaX / medidas.pxPorGrado;
  }, { passive: false });

  // Con Tab, la carta enfocada se va a la parte de arriba
  rueda.addEventListener('focusin', (e) => {
    if (!estado.listo) return;
    const carta = cartas.find((c) => c.el.contains(e.target));
    if (!carta) return;
    const deseado = -carta.base + GIRO_LEVANTE * estado.levante;
    estado.objetivo += envolver(deseado - estado.objetivo);
    estado.velocidad = 0;
  });

  // Escape o Tab terminan la intro de una vez
  document.addEventListener('keydown', (e) => {
    if (estado.listo) return;
    if (e.key === 'Escape' || e.key === 'Tab') saltarIntro();
  });
  botonSaltar.addEventListener('click', saltarIntro);

  function saltarIntro() {
    omitir = true;
    if (liberarOmision) liberarOmision();
    if (cartas.length > 0) terminarIntro();
  }

  window.addEventListener('resize', medir);

  // ---------- Tarjetas 3D de artistas ----------
  const CLAVE_FAVORITOS = 'btt-favoritos';

  function leerFavoritos() {
    try { return JSON.parse(localStorage.getItem(CLAVE_FAVORITOS)) || []; } catch (error) { return []; }
  }
  function guardarFavoritos(lista) {
    try { localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(lista)); } catch (error) { /* sin almacenamiento */ }
  }

  function crearTarjeta(item, favoritos) {
    const id = item.artista + '|' + (item.album || '');
    const titulo = item.album || 'Ver en Apple Music';
    const detalle = item.anio ? item.anio + ' · Álbum' : 'Álbum';
    const esFavorito = favoritos.includes(id);
    const enlace = escapar(enlaceDe(item));

    const tarjeta = document.createElement('article');
    tarjeta.className = 'tarjeta';
    tarjeta.dataset.id = id;
    tarjeta.dataset.artista = item.artista;
    tarjeta.innerHTML =
      '<div class="tarjeta__cuerpo" style="' + colores(item) + '">' +
        // Anillos y portada en capas, cada uno a una profundidad distinta
        '<div class="ondas" aria-hidden="true">' +
          '<span class="onda onda1"></span>' +
          '<span class="onda onda2"></span>' +
          '<span class="onda onda3"></span>' +
          '<span class="onda onda4' + (item.portada ? '' : ' onda4--vacia') + '">' +
            (item.portada ? '<img src="' + escapar(item.portada) + '" alt="Portada de ' + escapar(titulo) + '" width="128" height="128" draggable="false">' : '') +
          '</span>' +
        '</div>' +
        '<div class="capa-vidrio"></div>' +
        '<div class="contenido">' +
          '<h3>' + escapar(item.artista) + '</h3>' +
          '<p>' + escapar(titulo) + '</p>' +
          '<p class="contenido__detalle">' + escapar(detalle) + '</p>' +
        '</div>' +
        '<div class="base">' +
          '<div class="acciones">' +
            '<button class="redondo redondo--play" type="button" aria-label="Escuchar ' + escapar(titulo) + '">' +
              '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
              '<svg class="i-pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' +
            '</button>' +
            '<button class="redondo redondo--corazon" type="button" aria-pressed="' + esFavorito + '" aria-label="Guardar ' + escapar(item.artista) + ' en favoritos">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 2.9 5 6.2 5c2 0 3.2 1 3.8 2.1h4C14.6 6 15.8 5 17.8 5c3.3 0 5.3 3.3 3.8 6.8C19.5 16.4 12 21 12 21z"/></svg>' +
            '</button>' +
          '</div>' +
          '<a class="ver-mas" href="' + enlace + '" target="_blank" rel="noopener">Ver álbum <span aria-hidden="true">›</span></a>' +
        '</div>' +
      '</div>';

    tarjeta.querySelector('.redondo--play').addEventListener('click', () => Reproductor.escuchar(item));

    const botonCorazon = tarjeta.querySelector('.redondo--corazon');
    botonCorazon.addEventListener('click', () => {
      let lista = leerFavoritos();
      const activo = botonCorazon.getAttribute('aria-pressed') === 'true';
      lista = activo ? lista.filter((f) => f !== id) : lista.concat(id);
      botonCorazon.setAttribute('aria-pressed', String(!activo));
      guardarFavoritos(lista);
    });

    return tarjeta;
  }

  // La tarjeta del álbum que suena muestra el botón de pausa
  document.addEventListener('reproductor:cambio', (e) => {
    contenedorTarjetas.querySelectorAll('.tarjeta').forEach((t) => {
      t.classList.toggle('sonando', e.detail.sonando && t.dataset.id === e.detail.id);
    });
  });

  let tarjetasListas = false;

  function construirTarjetas(items) {
    const favoritos = leerFavoritos();
    contenedorTarjetas.textContent = '';
    items.filter((item) => item.destacado).forEach((item) => {
      contenedorTarjetas.appendChild(crearTarjeta(item, favoritos));
    });
    tarjetasListas = true;
  }

  // Si una portada llega después del tope de espera, la tarjeta se rehace con ella
  function refrescarTarjeta(item) {
    if (!tarjetasListas || !item.destacado || !item.portada) return;
    const id = item.artista + '|' + (item.album || '');
    const vieja = Array.from(contenedorTarjetas.children).find((t) => t.dataset.id === id || t.dataset.artista === item.artista);
    if (!vieja || vieja.querySelector('.onda4 img')) return;
    vieja.replaceWith(crearTarjeta(item, leerFavoritos()));
  }

  // ---------- Arranque ----------
  async function arrancar() {
    // Por si algo falla, el texto aparece igual a los 9 segundos
    setTimeout(mostrarTexto, 9000);

    if (sinMovimiento) {
      textoCarga.hidden = true;
      botonSaltar.hidden = true;
    }

    const carga = iniciarCarga((hechos, total) => {
      avanceCarga.textContent = 'Cargando portadas ' + Math.round((hechos / total) * 100) + '%';
    }, refrescarTarjeta);

    // Espero a que carguen las portadas, o a que alguien salte la intro
    const esperarOmision = new Promise((resolver) => { liberarOmision = resolver; });
    if (omitir) liberarOmision();
    await Promise.race([carga.terminada, esperarOmision]);

    construirTarjetas(carga.items);
    construirRueda(carga.items);
    medir();

    if (omitir) {
      terminarIntro();
    } else {
      fase = 'reparto';
      inicioFase = performance.now();
    }

    ultimoCuadro = performance.now();
    requestAnimationFrame(cuadro);
  }

  arrancar();
})();
