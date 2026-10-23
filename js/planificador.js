// Planificador de tareas · Sprint 2
// Aquí está toda la lógica: validar el formulario, la clase TaskManager,
// mostrar las tareas como tarjetas y eliminarlas.
// Las tareas se guardan solo en memoria (en un array), no en localStorage.

// ---------- Elementos de la página ----------
const form = document.querySelector('#tarea');
const nameInput = document.querySelector('#nombre');
const descriptionInput = document.querySelector('#descripcion');
const assigneeInput = document.querySelector('#asignadoA');
const dateInput = document.querySelector('#fechaEntrega');
const statusSelect = document.querySelector('#estado');
const savingView = document.querySelector('#saving');
const taskList = document.querySelector('#task-list');
const emptyMessage = document.querySelector('#task-empty');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Clase TaskManager ----------
// Guarda la lista de tareas y tiene los métodos para manejarla.
// Cada tarea es un objeto: { id, nombre, descripcion, asignadoA, fechaDeEntrega, estado }
class TaskManager {
  constructor() {
    this.tasks = []; // array interno donde se guardan las tareas
    this.nextId = 1; // contador: cada tarea nueva usa este número y después sube 1
  }

  // Devuelve todas las tareas
  getAllTasks() {
    return [...this.tasks];
  }

  // Devuelve solo las tareas que tienen el estado que le pasamos
  getTasksWithStatus(status) {
    return this.tasks.filter((task) => task.estado === status);
  }

  // Agrega una tarea a la lista. Aquí le pongo el id, así nunca se repite
  addTask(task) {
    const newTask = { ...task, id: this.nextId };
    this.nextId++;
    this.tasks.push(newTask);
    return newTask;
  }

  // Elimina la tarea con ese id. Devuelve true si la encontró y la borró
  deleteTask(taskId) {
    const sizeBefore = this.tasks.length;
    this.tasks = this.tasks.filter((task) => task.id !== taskId);
    return this.tasks.length < sizeBefore;
  }

  // Cambia el estado de una tarea. Devuelve la tarea, o null si no existe
  updateTask(taskId, status) {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) {
      return null;
    }
    task.estado = status;
    return task;
  }

  // Cambia la persona asignada a una tarea. Devuelve la tarea, o null si no existe
  assignTask(taskId, assignee) {
    const task = this.tasks.find((item) => item.id === taskId);
    if (!task) {
      return null;
    }
    task.asignadoA = assignee;
    return task;
  }
}

const taskManager = new TaskManager();

// ---------- Validación ----------
// Revisa un texto: no puede estar en blanco y tiene que ser más largo que minLength.
// Devuelve el mensaje de error, o '' si está bien
function textError(label, value, minLength) {
  if (value === '') {
    return label + ' no puede estar en blanco.';
  }
  if (value.length <= minLength) {
    return label + ' debe tener más de ' + minLength + ' caracteres.';
  }
  return '';
}

// Muestra el mensaje de error debajo del campo (o lo borra si el mensaje está vacío)
function showError(input, message) {
  document.querySelector('#' + input.id + '-error').textContent = message;
  input.closest('.group').classList.toggle('has-error', message !== '');
  input.setAttribute('aria-invalid', message !== '' ? 'true' : 'false');
}

// Valida todos los campos del formulario antes de agregar la tarea.
// Devuelve true si todo está bien y false si algún campo es inválido
function validateTaskForm() {
  const checks = [
    [nameInput, textError('El nombre', nameInput.value.trim(), 8)],
    [descriptionInput, textError('La descripción', descriptionInput.value.trim(), 15)],
    [assigneeInput, textError('El campo "Asignado a"', assigneeInput.value.trim(), 8)],
    [dateInput, dateInput.value === '' ? 'La fecha de entrega no puede estar en blanco.' : ''],
    [statusSelect, statusSelect.value === '' ? 'Debes elegir un estado para la tarea.' : '']
  ];

  let firstInvalid = null;
  checks.forEach(([input, message]) => {
    showError(input, message);
    if (message !== '' && firstInvalid === null) {
      firstInvalid = input;
    }
  });

  // si hay errores, el cursor se va al primer campo malo
  if (firstInvalid !== null) {
    firstInvalid.focus();
    return false;
  }
  return true;
}

// ---------- Tarjetas ----------
// Crea un elemento con su clase y su texto (uso textContent para no meter HTML por accidente)
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// Convierte 2026-10-20 en 20/10/2026
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-');
  return day + '/' + month + '/' + year;
}

// Crea la tarjeta HTML de una tarea y la devuelve (todavía no la pone en la página)
function createTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  card.dataset.id = task.id;

  // La etiqueta del estado lleva el estado en data-estado para que el CSS le ponga color
  const statusTag = makeElement('span', 'task-card-status', task.estado);
  statusTag.dataset.estado = task.estado;

  const deleteButton = makeElement('button', 'boton boton--chico', 'Eliminar');
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', 'Eliminar la tarea ' + task.nombre);
  deleteButton.addEventListener('click', () => handleDelete(task.id, card));

  card.append(
    makeElement('h3', 'task-card-name', task.nombre),
    makeElement('p', 'task-card-text', task.descripcion),
    makeElement('p', 'task-card-meta', 'Asignado a: ' + task.asignadoA),
    makeElement('p', 'task-card-meta', 'Fecha de entrega: ' + formatDate(task.fechaDeEntrega)),
    statusTag,
    deleteButton
  );
  return card;
}

// Muestra el mensaje "todavía no hay tareas" solo cuando la lista está vacía
function updateEmptyMessage() {
  emptyMessage.hidden = taskManager.getAllTasks().length > 0;
}

// Elimina la tarea del array y la tarjeta de la pantalla
function handleDelete(taskId, card) {
  if (taskManager.deleteTask(taskId)) {
    card.remove();
    updateEmptyMessage();
  }
}

// ---------- Hámster ----------
// Esconde el formulario un momento, muestra el hámster y después vuelve el formulario
function showSavingHamster() {
  form.hidden = true;
  savingView.hidden = false;
  document.querySelector('#saving-title').focus();

  setTimeout(() => {
    savingView.hidden = true;
    form.hidden = false;
    nameInput.focus();
  }, reducedMotion ? 500 : 1500);
}

// ---------- Eventos ----------
form.addEventListener('submit', (event) => {
  // evito que la página se recargue al enviar
  event.preventDefault();

  // si la validación falla, no se agrega nada
  if (!validateTaskForm()) {
    return;
  }

  // leo los valores y creo la tarea (el id lo pone addTask)
  const newTask = taskManager.addTask({
    nombre: nameInput.value.trim(),
    descripcion: descriptionInput.value.trim(),
    asignadoA: assigneeInput.value.trim(),
    fechaDeEntrega: dateInput.value,
    estado: statusSelect.value
  });

  // pongo la tarjeta en la página y limpio el formulario
  taskList.append(createTaskCard(newTask));
  updateEmptyMessage();
  form.reset();
  showSavingHamster();
});

// Al escribir en un campo que tenía error, le quito el mensaje
[nameInput, descriptionInput, assigneeInput, dateInput, statusSelect].forEach((input) => {
  input.addEventListener('input', () => showError(input, ''));
});

// El botón Limpiar también borra los mensajes de error
form.addEventListener('reset', () => {
  [nameInput, descriptionInput, assigneeInput, dateInput, statusSelect].forEach((input) => {
    showError(input, '');
  });
});

updateEmptyMessage();
