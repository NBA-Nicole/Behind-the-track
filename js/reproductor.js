// Reproductor fijo de abajo (como el de Apple Music).
// Suena la vista previa de 30 segundos de cada canción que da la API de iTunes
// y pasa sola a la siguiente. Necesita js/catalogo.js cargado antes (buscarCanciones).
//
// Desde afuera solo se usa:
//   Reproductor.escuchar(item)   -> abre el álbum y empieza a sonar
//   y el evento "reproductor:cambio" en document, para saber qué álbum suena.

const Reproductor = (function () {
  'use strict';

  const caja = document.getElementById('reproductor');
  const audio = document.getElementById('rp-audio');
  const portada = document.getElementById('rp-portada');
  const titulo = document.getElementById('rp-titulo');
  const artista = document.getElementById('rp-artista');
  const botonPlay = document.getElementById('rp-play');
  const botonAnterior = document.getElementById('rp-anterior');
  const botonSiguiente = document.getElementById('rp-siguiente');
  const botonCerrar = document.getElementById('rp-cerrar');
  const barra = document.getElementById('rp-progreso');
  const tiempoActual = document.getElementById('rp-actual');
  const tiempoTotal = document.getElementById('rp-total');
  const enlaceApple = document.getElementById('rp-apple');

  let album = null;        // el item que se está escuchando
  let canciones = [];
  let indice = 0;
  let pidiendo = 0;        // para ignorar respuestas viejas si se cambia de álbum rápido

  // El iPhone (y a veces Android) solo deja sonar un <audio> si empezó justo en un toque.
  // Como las canciones se buscan DESPUÉS del toque, aquí "reservamos" el permiso
  // con un silencio cortísimo y luego le cambiamos la canción.
  const SILENCIO = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  let desbloqueado = false;

  function desbloquear() {
    if (desbloqueado) return false;
    desbloqueado = true;
    audio.src = SILENCIO;
    audio.play().catch(() => { /* si no deja, el botón de play sigue disponible */ });
    return true;
  }

  const idDe = (item) => item.artista + '|' + (item.album || '');

  function formatear(segundos) {
    if (!isFinite(segundos)) return '0:00';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function avisar() {
    document.dispatchEvent(new CustomEvent('reproductor:cambio', {
      detail: { id: album ? idDe(album) : null, sonando: !audio.paused && !audio.ended }
    }));
  }

  function abrirCaja() {
    caja.hidden = false;
    document.documentElement.classList.add('con-reproductor');
  }

  function cerrar() {
    audio.pause();
    audio.removeAttribute('src');
    album = null;
    canciones = [];
    caja.hidden = true;
    document.documentElement.classList.remove('con-reproductor');
    avisar();
  }

  function mostrarAlbum(item) {
    titulo.textContent = item.album || item.artista;
    artista.textContent = item.artista;
    portada.src = item.portada || '';
    portada.hidden = !item.portada;
    enlaceApple.href = item.enlace && item.enlace.startsWith('https://')
      ? item.enlace
      : 'https://music.apple.com/search?term=' + encodeURIComponent(item.artista + ' ' + (item.album || ''));
  }

  function ponerCancion(i) {
    indice = i;
    const cancion = canciones[i];
    audio.src = cancion.audio;
    titulo.textContent = cancion.titulo;
    const detalle = album.audio ? album.coleccion : album.album;
    artista.textContent = album.artista + (detalle ? ' · ' + detalle : '');
    barra.value = 0;
    barra.style.setProperty('--avance', '0%');
    tiempoActual.textContent = '0:00';
    tiempoTotal.textContent = '0:30';
    botonAnterior.disabled = i === 0;
    botonSiguiente.disabled = i === canciones.length - 1;
    return audio.play().catch(() => {
      // El navegador no dejó empezar solo: que la persona toque play
      artista.textContent = 'Toca play para escuchar';
    });
  }

  async function escuchar(item) {
    // Si ya es este álbum, el botón hace de play / pausa
    if (album && idDe(album) === idDe(item) && audio.src) {
      alternar();
      return;
    }

    const turno = ++pidiendo;
    album = item;
    canciones = [];
    mostrarAlbum(item);
    titulo.textContent = 'Cargando ' + (item.album || item.artista) + '…';
    botonPlay.disabled = true;
    botonAnterior.disabled = true;
    botonSiguiente.disabled = true;
    // Esto tiene que pasar dentro del toque, antes de esperar a internet
    if (!desbloquear()) audio.pause();
    abrirCaja();
    avisar();

    // Una canción trae su propia vista previa; un álbum se busca por todas sus canciones
    const lista = item.audio
      ? [{ titulo: item.album, audio: item.audio }]
      : await buscarCanciones(item.idColeccion);
    if (turno !== pidiendo) return;      // mientras tanto eligieron otro álbum

    if (lista.length === 0) {
      titulo.textContent = 'No hay vista previa disponible';
      artista.textContent = 'Puedes escucharla completa en Apple Music';
      return;
    }

    canciones = lista;
    botonPlay.disabled = false;
    ponerCancion(0);
  }

  function alternar() {
    if (!audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  // ---------- Botones ----------
  botonPlay.addEventListener('click', alternar);
  botonCerrar.addEventListener('click', cerrar);
  botonAnterior.addEventListener('click', () => { if (indice > 0) ponerCancion(indice - 1); });
  botonSiguiente.addEventListener('click', () => { if (indice < canciones.length - 1) ponerCancion(indice + 1); });

  // Arrastrar la barra mueve la canción
  barra.addEventListener('input', () => {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = (barra.value / 1000) * audio.duration;
  });

  // ---------- Lo que dice el audio ----------
  audio.addEventListener('play', () => { caja.classList.add('sonando'); avisar(); });
  audio.addEventListener('pause', () => { caja.classList.remove('sonando'); avisar(); });

  audio.addEventListener('timeupdate', () => {
    if (!isFinite(audio.duration)) return;
    const parte = audio.currentTime / audio.duration;
    barra.value = Math.round(parte * 1000);
    barra.style.setProperty('--avance', (parte * 100).toFixed(1) + '%');
    tiempoActual.textContent = formatear(audio.currentTime);
    tiempoTotal.textContent = formatear(audio.duration);
  });

  audio.addEventListener('ended', () => {
    if (indice < canciones.length - 1) {
      ponerCancion(indice + 1);
    } else {
      caja.classList.remove('sonando');
      avisar();
    }
  });

  // Si una vista previa falla, pasamos a la siguiente en vez de quedarnos callados
  audio.addEventListener('error', () => {
    if (audio.src && indice < canciones.length - 1) ponerCancion(indice + 1);
  });

  // Barra espaciadora = play / pausa (menos cuando se escribe o hay un botón enfocado)
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || caja.hidden) return;
    const destino = e.target;
    if (destino.closest('input, textarea, select, button, a')) return;
    e.preventDefault();
    alternar();
  });

  return { escuchar: escuchar };
})();
