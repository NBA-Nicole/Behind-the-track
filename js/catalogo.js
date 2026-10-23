// Catálogo de la portada de Behind the Track.
// Aquí solo dejo artista y álbum; la portada, el año y el enlace
// los trae la API de iTunes (gratis y sin llave).
// Si "album" es null, busca el primer álbum que salga de ese artista.
// "colores" es el degradado que se ve si la portada no carga.
// Si algún día una portada no aparece, se puede forzar con un campo extra:
//   { artista: '...', album: '...', portada: 'img/mi-portada.jpg', ... }

const CATALOGO = [
  { artista: 'Hayley Williams', album: 'Ego Death at a Bachelorette Party', destacado: true, colores: ['#ff9aa8', '#9b5de5'] },
  { artista: 'Billie Eilish',   album: 'Hit Me Hard and Soft',  destacado: true, colores: ['#8fd9cf', '#3b6ea5'] },
  { artista: 'Don Toliver',     album: 'Hardstone Psycho',      destacado: true, colores: ['#ffb26b', '#b5179e'] },
  { artista: 'Tame Impala',     album: 'Currents',              destacado: true, colores: ['#ff7eb6', '#ffb347'] },
  { artista: 'Inner Wave',      album: null,                    destacado: true, colores: ['#8fd3f4', '#7ee8a8'] },
  { artista: 'Paramore',        album: 'After Laughter',        colores: ['#ffd36e', '#ff6f91'] },
  { artista: 'Frank Ocean',     album: 'Blonde',                colores: ['#f6e7a8', '#e5989b'] },
  { artista: 'Lorde',           album: 'Melodrama',             colores: ['#7aa2f7', '#c77dff'] },
  { artista: 'Mitski',          album: 'Be the Cowboy',         colores: ['#f4a6a6', '#7b6d8d'] },
  { artista: 'Radiohead',       album: 'In Rainbows',           colores: ['#ffd166', '#ef476f'] },
  { artista: 'Arctic Monkeys',  album: 'AM',                    colores: ['#cfd3da', '#5c6370'] },
  { artista: 'SZA',             album: 'SOS',                   colores: ['#6ec6ff', '#2a6fdb'] }
];

// Quita tildes y mayúsculas para comparar nombres sin problemas
function normalizar(texto) {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Pide una dirección de iTunes con JSONP (una etiqueta <script>).
// Lo hago así porque fetch puede toparse con CORS, sobre todo si abres el
// index.html directo desde el disco, y un <script> nunca tiene ese problema.
let contadorPeticiones = 0;

function pedirITunes(url) {
  return new Promise((resolver) => {
    const nombre = 'btt_itunes_' + (contadorPeticiones++);
    const etiqueta = document.createElement('script');

    function limpiar() {
      clearTimeout(corte);
      delete window[nombre];
      etiqueta.remove();
    }

    // Si la API se demora más de 5 segundos, seguimos sin portada
    const corte = setTimeout(() => { limpiar(); resolver(null); }, 5000);

    window[nombre] = (datos) => { limpiar(); resolver(datos); };
    etiqueta.onerror = () => { limpiar(); resolver(null); };
    etiqueta.src = url + '&callback=' + nombre;
    document.head.appendChild(etiqueta);
  });
}

// Busca un álbum en iTunes. Devuelve { album, portada, enlace, anio } o null.
async function buscarAlbum(item) {
  const clave = 'btt2:' + item.artista + '|' + (item.album || '');

  // Si ya lo buscamos en esta sesión, lo reutilizamos
  try {
    const guardado = sessionStorage.getItem(clave);
    if (guardado) return JSON.parse(guardado);
  } catch (error) { /* sin sessionStorage, no pasa nada */ }

  const termino = item.album ? item.artista + ' ' + item.album : item.artista;
  const url = 'https://itunes.apple.com/search?media=music&entity=album&limit=10&term=' + encodeURIComponent(termino);

  const datos = await pedirITunes(url);
  if (!datos || !Array.isArray(datos.results)) return null;

  const artista = normalizar(item.artista);
  const delArtista = datos.results.filter((r) => r.artworkUrl100 && normalizar(r.artistName).includes(artista));
  if (delArtista.length === 0) return null;

  // Si pedí un álbum concreto, prefiero el que se llame parecido
  let hallado = delArtista[0];
  if (item.album) {
    const titulo = normalizar(item.album);
    hallado = delArtista.find((r) => normalizar(r.collectionName).includes(titulo)) || hallado;
  }

  const resultado = {
    album: hallado.collectionName,
    portada: hallado.artworkUrl100.replace('100x100bb', '600x600bb'),
    enlace: hallado.collectionViewUrl,
    idColeccion: hallado.collectionId,
    anio: hallado.releaseDate ? hallado.releaseDate.slice(0, 4) : ''
  };

  try { sessionStorage.setItem(clave, JSON.stringify(resultado)); } catch (error) { /* igual */ }
  return resultado;
}

// Arranca la carga de todo el catálogo.
// Devuelve los items (se van llenando solos) y una promesa "terminada".
// alLlegar(item) avisa cada vez que a un álbum le llegan sus datos, incluso
// después del tope, para que las tarjetas puedan ponerse la portada tarde.
function iniciarCarga(alProgreso, alLlegar) {
  const items = CATALOGO.map((item) => ({ ...item }));
  let hechos = 0;

  const cargas = items.map(async (item) => {
    const datos = await buscarAlbum(item);

    if (datos) {
      item.album = datos.album;
      item.enlace = datos.enlace;
      item.idColeccion = datos.idColeccion;
      item.anio = datos.anio;
    }

    // Portada puesta a mano en el catálogo, o la que trajo la API
    const direccion = item.portada || (datos && datos.portada);
    if (direccion) {
      // Decodifico la imagen antes de usarla para que no aparezca de golpe en la animación
      const imagen = new Image();
      imagen.src = direccion;
      try {
        await imagen.decode();
        item.portada = direccion;
      } catch (error) {
        item.portada = null;       // si falla la imagen, queda el degradado
      }
    }

    hechos++;
    alProgreso(hechos, items.length);
    if (alLlegar) alLlegar(item);
  });

  // Tope de 6 segundos para no dejar a nadie esperando
  const tope = new Promise((resolver) => setTimeout(resolver, 6000));
  const terminada = Promise.race([Promise.all(cargas), tope]);

  return { items, terminada };
}

// Trae las canciones de un álbum con su vista previa de 30 segundos.
// Devuelve una lista de { titulo, numero, audio, duracion } o [] si no hay.
async function buscarCanciones(idColeccion) {
  if (!idColeccion) return [];
  const clave = 'btt2-canciones:' + idColeccion;

  try {
    const guardado = sessionStorage.getItem(clave);
    if (guardado) return JSON.parse(guardado);
  } catch (error) { /* sin sessionStorage, no pasa nada */ }

  const datos = await pedirITunes('https://itunes.apple.com/lookup?entity=song&id=' + idColeccion);
  if (!datos || !Array.isArray(datos.results)) return [];

  const canciones = datos.results
    .filter((r) => r.wrapperType === 'track' && r.previewUrl)
    .map((r) => ({
      titulo: r.trackName,
      numero: r.trackNumber,
      audio: r.previewUrl,
      duracion: r.trackTimeMillis
    }))
    .sort((a, b) => a.numero - b.numero);

  try { sessionStorage.setItem(clave, JSON.stringify(canciones)); } catch (error) { /* igual */ }
  return canciones;
}
