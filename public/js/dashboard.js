function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function getToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user && user.token ? user.token : null;
  } catch { return null; }
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

const API_URL = '/api/empleos';
const user = JSON.parse(localStorage.getItem('user') || 'null');
let editandoId = null;

if (!user || user.tipo !== 'empresa') {
  window.location.href = '/login.html';
}

document.getElementById('user-name').textContent = user?.nombre || '';

function logout() {
  localStorage.removeItem('user');
  window.location.href = '/';
}

function mostrarSeccion(seccion) {
  document.querySelectorAll('[id^="seccion-"]').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('[id^="tab-"]').forEach(t => {
    t.classList.remove('tab-active');
    t.classList.add('text-secondary');
  });

  document.getElementById(`seccion-${seccion}`).classList.remove('hidden');
  document.getElementById(`tab-${seccion}`).classList.add('tab-active');
  document.getElementById(`tab-${seccion}`).classList.remove('text-secondary');
}

async function cargarMisEmpleos() {
  const res = await fetch(`${API_URL}/mios`, { headers: authHeaders() });
  if (res.status === 401) { window.location.href = '/login.html'; return; }
  const data = await res.json();
  const empleos = data.empleos || [];

  document.getElementById('stat-empleos').textContent = empleos.length;
  document.getElementById('stat-activos').textContent = empleos.filter(e => !e.expirado).length;

  const list = document.getElementById('mis-empleos-list');
  if (empleos.length === 0) {
    list.innerHTML = `<div class="text-center py-20 border-4 border-dashed border-primary">
      <span class="material-symbols-outlined text-[48px] text-secondary">work_off</span>
      <h3 class="font-headline-md text-xl mt-4 text-primary">No tienes empleos publicados</h3>
      <p class="text-secondary mt-2 mb-6 font-label-bold uppercase text-sm">Publica tu primer empleo para comenzar a recibir aplicaciones por email</p>
      <button onclick="mostrarSeccion('publicar')" class="active-scale bg-primary text-on-primary px-8 py-3 font-label-bold uppercase text-sm border-2 border-primary neo-shadow transition-all hover:-translate-y-0.5">PUBLICAR EMPLEO</button>
    </div>`;
    return;
  }

  list.innerHTML = empleos.map(e => `
    <div class="bg-surface border-4 border-primary neo-shadow p-6 flex items-center justify-between">
      <div class="flex-1">
        <h4 class="font-headline-md text-xl uppercase text-primary">${escapeHtml(e.titulo)}</h4>
        <p class="text-secondary font-label-sm mt-1">${escapeHtml(e.departamento)} • ${formatDate(e.fecha_limite)}</p>
      </div>
      <div class="flex gap-3">
        <button onclick="editarEmpleo(${e.id})" class="bg-surface text-primary px-4 py-2 font-label-bold uppercase text-xs border-2 border-primary hover:bg-primary hover:text-on-primary transition-colors">EDITAR</button>
        <button onclick="eliminarEmpleo(${e.id})" class="bg-surface text-error px-4 py-2 font-label-bold uppercase text-xs border-2 border-error hover:bg-error hover:text-white transition-colors">ELIMINAR</button>
      </div>
    </div>
  `).join('');
}

async function eliminarEmpleo(id) {
  if (!confirm('¿Eliminar este empleo?')) return;
  await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: authHeaders() });
  cargarMisEmpleos();
}

async function editarEmpleo(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) { alert('No se pudo cargar el empleo'); return; }
  const e = await res.json();

  editandoId = id;
  document.getElementById('titulo').value = e.titulo || '';
  document.getElementById('empresa').value = e.empresa || '';
  document.getElementById('categoria').value = e.categoria || '';
  document.getElementById('departamentos').value = e.departamento || '';
  document.getElementById('descripcion').value = e.descripcion || '';
  document.getElementById('salario').value = e.salario || '';
  document.getElementById('email_postulacion').value = e.email_postulacion || '';
  document.getElementById('fecha_limite').value = e.fecha_limite || '';

  document.getElementById('form-titulo').textContent = 'Editar empleo';
  document.getElementById('btn-publicar').textContent = 'GUARDAR CAMBIOS';
  mostrarSeccion('publicar');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetModoNuevo() {
  editandoId = null;
  document.getElementById('form-titulo').textContent = 'Nuevo empleo';
  document.getElementById('btn-publicar').textContent = 'PUBLICAR EMPLEO';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

document.getElementById('nuevoEmpleoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    titulo: document.getElementById('titulo').value,
    empresa: document.getElementById('empresa').value,
    categoria: document.getElementById('categoria').value,
    departamento: document.getElementById('departamentos').value,
    descripcion: document.getElementById('descripcion').value,
    salario: document.getElementById('salario')?.value || '',
    email_postulacion: document.getElementById('email_postulacion').value,
    fecha_limite: document.getElementById('fecha_limite').value
  };

  const method = editandoId ? 'PUT' : 'POST';
  const url = editandoId ? `${API_URL}/${editandoId}` : API_URL;

  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(data)
  });

  if (res.status === 401) { window.location.href = '/login.html'; return; }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || (editandoId ? 'Error al guardar los cambios' : 'Error al publicar el empleo'));
    return;
  }

  e.target.reset();
  resetModoNuevo();
  document.getElementById('empresa').value = user.nombre;
  mostrarSeccion('mis-empleos');
  cargarMisEmpleos();
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('empresa').value = user?.nombre || '';
  cargarMisEmpleos();
});
