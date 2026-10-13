// Planificador de Tareas
// Flujo: formulario -> hámster (guardando) -> resumen de la tarea guardada.

const form = document.getElementById('tarea');
const saving = document.getElementById('saving');
const saved = document.getElementById('saved');
const status = document.getElementById('status');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let timer = null;

// Muestra solo uno de los tres estados: 'form', 'saving' o 'saved'
function show(which) {
  form.hidden = which !== 'form';
  saving.hidden = which !== 'saving';
  saved.hidden = which !== 'saved';
}

// Convierte 2026-10-13 en 13/10/2026
function formatFecha(valor) {
  const partes = valor.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
}

form.addEventListener('reset', () => {
  status.textContent = '';
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  // Validación: avisa qué campo falta
  if (!form.checkValidity()) {
    const primero = form.querySelector(':invalid');
    const etiqueta = document.querySelector(`label[for="${primero.id}"]`);
    status.textContent = `Falta completar: ${etiqueta ? etiqueta.textContent : 'un campo'}.`;
    primero.focus();
    return;
  }

  status.textContent = '';

  const tarea = {
    nombre: form.nombre.value.trim(),
    descripcion: form.descripcion.value.trim(),
    asignadoA: form.asignadoA.value.trim(),
    fechaEntrega: formatFecha(form.fechaEntrega.value),
    estado: form.estado.value,
  };

  // 1) Hámster mientras "guarda"
  show('saving');
  document.getElementById('savingTitle').focus();

  // 2) Después de unos segundos, muestra el resumen
  clearTimeout(timer);
  timer = setTimeout(() => {
    document.getElementById('rNombre').textContent = tarea.nombre;
    document.getElementById('rDescripcion').textContent = tarea.descripcion;
    document.getElementById('rAsignado').textContent = tarea.asignadoA;
    document.getElementById('rFecha').textContent = tarea.fechaEntrega;
    document.getElementById('rEstado').textContent = tarea.estado;

    form.reset();
    show('saved');
    document.getElementById('savedTitle').focus();
  }, reducedMotion ? 1200 : 2800);
});

// 3) Volver al formulario vacío
document.getElementById('otra').addEventListener('click', () => {
  show('form');
  form.nombre.focus();
});
