const API_URL = window.location.hostname.includes('netlify.app')
  ? '/.netlify/functions/empleos'
  : '/api/empleos';

const AUTH_URL = window.location.hostname.includes('netlify.app')
  ? '/.netlify/functions/auth'
  : '/api/auth';

const POSTULACIONES_URL = window.location.hostname.includes('netlify.app')
  ? '/.netlify/functions/postulaciones'
  : '/api/postulaciones';
const user = JSON.parse(localStorage.getItem('user'));

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
  const res = await fetch(`${API_URL}?limit=100`);
  const data = await res.json();
  const empleos = (data.empleos || data).filter(e => e.empresa === user.nombre);

  document.getElementById('stat-empleos').textContent = empleos.length;
  document.getElementById('stat-activos').textContent = empleos.length;

  const list = document.getElementById('mis-empleos-list');
  if (empleos.length === 0) {
    list.innerHTML = `<div class="text-center py-20 border-[3px] border-dashed border-black">
      <span class="material-symbols-outlined text-[48px] text-neutral-300">work_off</span>
      <h3 class="font-headline-md text-xl mt-4">No tienes empleos publicados</h3>
      <p class="text-secondary mt-2 mb-6">Publica tu primer empleo para comenzar a recibir postulaciones</p>
      <button onclick="mostrarSeccion('publicar')" class="brutalist-btn bg-primary text-on-primary px-8 py-3 font-label-bold uppercase text-sm">PUBLICAR EMPLEO</button>
    </div>`;
    return;
  }

  list.innerHTML = empleos.map(e => `
    <div class="brutalist-card bg-white p-6 flex items-center justify-between">
      <div class="flex-1">
        <h4 class="font-headline-md text-xl uppercase">${e.titulo}</h4>
        <p class="text-secondary font-label-sm mt-1">${e.departamento} • ${formatDate(e.fecha_limite)}</p>
      </div>
      <div class="flex gap-3">
        <button onclick="eliminarEmpleo(${e.id})" class="brutalist-btn bg-white text-red-600 px-4 py-2 font-label-bold uppercase text-xs border-2 border-red-600 hover:bg-red-600 hover:text-white">ELIMINAR</button>
      </div>
    </div>
  `).join('');
}

async function cargarPostulaciones() {
  const res = await fetch('/api/postulaciones');
  const postulaciones = await res.json();

  document.getElementById('stat-postulaciones').textContent = postulaciones.length;

  const list = document.getElementById('postulaciones-list');
  if (postulaciones.length === 0) {
    list.innerHTML = `<div class="text-center py-20 border-[3px] border-dashed border-black">
      <span class="material-symbols-outlined text-[48px] text-neutral-300">inbox</span>
      <h3 class="font-headline-md text-xl mt-4">Sin postulaciones aún</h3>
      <p class="text-secondary mt-2">Las postulaciones aparecerán aquí cuando alguien aplique a tus empleos</p>
    </div>`;
    return;
  }

  list.innerHTML = postulaciones.map(p => `
    <div class="brutalist-card bg-white p-6">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="font-label-bold uppercase">${p.nombre}</h4>
          <p class="text-secondary text-sm">${p.email} • ${p.telefono || 'Sin teléfono'}</p>
          ${p.carta ? `<p class="mt-3 text-secondary text-sm italic">"${p.carta}"</p>` : ''}
        </div>
        <span class="bg-neutral-200 px-3 py-1 text-[10px] font-bold uppercase">Empleo #${p.empleo_id}</span>
      </div>
    </div>
  `).join('');
}

async function eliminarEmpleo(id) {
  if (!confirm('¿Eliminar este empleo?')) return;
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  cargarMisEmpleos();
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
    fecha_limite: document.getElementById('fecha_limite').value
  };

  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  e.target.reset();
  document.getElementById('empresa').value = user.nombre;
  mostrarSeccion('mis-empleos');
  cargarMisEmpleos();
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('empresa').value = user?.nombre || '';
  cargarMisEmpleos();
  cargarPostulaciones();
});
