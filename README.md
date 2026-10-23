# Behind the Track

> Lo que hay detrás de cada canción.

**Behind the Track** es una plataforma web para descubrir artistas y álbumes nuevos, y para entender la música que ya escuchas: quién la hizo, cómo se creó y qué historia hay detrás.

Proyecto personal del bootcamp de **Desarrollador Full Stack Java Jr** (Generation).

---

## La idea

Escuchar música es fácil. Saber qué hay detrás de ella, no tanto. Muchas plataformas te dan el catálogo y un botón de reproducir, pero poco contexto.

Behind the Track quiere cubrir ese vacío:

- Descubrir **artistas y álbumes** nuevos.
- Conocer el **proceso creativo** de un álbum: cómo se grabó, quién produjo, qué influencias tuvo.
- Leer **datos y curiosidades** de la música que escuchas.
- **Escuchar** directamente desde la página con un reproductor integrado.

## Qué hay hecho hasta ahora

- **Portada** con una rueda de portadas de álbumes que se reparte, se levanta y gira sola. Se puede arrastrar con el mouse o con el dedo.
- **Tarjetas de artistas** en 3D con la portada del álbum, botón de play y corazón para guardar favoritos (se guardan en el navegador).
- **Reproductor fijo abajo**, como el de Apple Music: al darle play a un álbum suenan las vistas previas de 30 segundos de sus canciones, con anterior, siguiente y barra de avance. El álbum completo se abre en Apple Music.
- **Planificador de tareas** con formulario validado, tarjetas de tareas y opción de eliminarlas.
- Diseño de vidrio inspirado en Apple Music, con menú inferior en el celular.

Las portadas, los años, los enlaces y las vistas previas salen de la [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) de Apple, que es gratis y no pide llave. Si no hay internet, las tarjetas se ven igual con un disco de vinilo de los colores del artista.

## Funcionalidades planeadas

### Versión mínima (MVP)

- [ ] Registro e inicio de sesión de usuarios
- [ ] Catálogo de artistas y álbumes
- [ ] Página de artista (biografía y discografía)
- [ ] Página de álbum (año, sello, créditos y proceso creativo)
- [ ] Buscador y filtros por género, década y país
- [ ] Favoritos y lista de "por escuchar" (hoy los favoritos solo viven en el navegador)
- [ ] Reproducción de canciones completas (hoy el reproductor solo toca vistas previas de 30 segundos)

### Ideas a futuro

- [ ] Reseñas y comentarios de la comunidad
- [ ] Rol de editor para publicar artículos
- [ ] "Álbum del día"
- [ ] Recomendaciones por género

## Tecnologías

| Área | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript (sin librerías) |
| Portadas y enlaces | iTunes Search API |
| Backend (planeado) | Java, Spring Boot, Spring Data JPA, Spring Security |
| Base de datos (planeada) | MySQL / PostgreSQL |
| Datos musicales (planeado) | MusicBrainz, Cover Art Archive |
| Reproducción | Reproductor propio con las vistas previas de iTunes; canciones completas con Apple MusicKit (planeado) |
| Control de versiones | Git y GitHub |
| Gestión del proyecto | Scrum con GitHub Projects |

> Las tecnologías pueden cambiar a medida que avance el proyecto.

## Cómo verlo en tu computador

No hace falta instalar nada. Descarga o clona el repositorio y abre `index.html` en el navegador.

```bash
git clone https://github.com/NBA-Nicole/Behind-the-track.git
cd Behind-the-track
```

Si usas VS Code, también sirve la extensión Live Server (clic derecho en `index.html` y "Open with Live Server"). Necesitas conexión a internet para que carguen las portadas.

## Estructura

```
index.html            portada
planificador.html     planificador de tareas
css/
  base.css            colores, vidrio, fondo, barra y botones (lo usan las dos páginas)
  inicio.css          rueda de álbumes y tarjetas 3D
  planificador.css    formulario, tarjetas de tareas y el hámster
js/
  catalogo.js         lista de artistas, portadas y canciones desde iTunes
  reproductor.js      reproductor fijo de abajo
  inicio.js           animación de la rueda, arrastre y tarjetas
  planificador.js     validación, TaskManager y tarjetas de tareas
```

Para cambiar los artistas de la portada se edita la lista `CATALOGO` al inicio de `js/catalogo.js`.

## Gestión del proyecto

El trabajo se organiza con **Scrum** en el planner del repositorio (GitHub Projects), con backlog, sprints e historias de usuario:

Ver planner del proyecto: https://github.com/users/NBA-Nicole/projects/3

## Estado actual

En desarrollo. Ya están la portada, las tarjetas de artistas y el planificador de tareas (Sprint 1 y Sprint 2). Lo que sigue es el catálogo real con backend y las páginas de artista y álbum.

## Autora

**Nicole** — [@NBA-Nicole](https://github.com/NBA-Nicole)
