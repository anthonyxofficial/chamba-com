const API_URL = window.location.hostname.includes('netlify.app')
  ? '/.netlify/functions/empleos'
  : '/api/empleos';

const ICONS = {
  'Informática y Programación': 'terminal',
  'Ventas y Comercial': 'shopping_bag',
  'Finanzas y Contabilidad': 'calculate',
  'Ingeniería y Técnico': 'engineering',
  'Servicio al Cliente': 'support_agent',
  'Administración de Empresas': 'corporate_fare',
  'Recursos Humanos': 'people',
  'Marketing y Comunicación': 'campaign',
  'Logística, Almacén y Compras': 'local_shipping'
};

const TAGS = {
  'Informática y Programación': 'TECNOLOGÍA',
  'Ventas y Comercial': 'VENTAS',
  'Finanzas y Contabilidad': 'FINANZAS',
  'Ingeniería y Técnico': 'INGENIERÍA',
  'Servicio al Cliente': 'SERVICIO',
  'Administración de Empresas': 'ADMIN',
  'Recursos Humanos': 'RRHH',
  'Marketing y Comunicación': 'MARKETING',
  'Logística, Almacén y Compras': 'LOGÍSTICA'
};

let currentPage = 1;
let currentCategoria = '';
let currentDepartamento = '';
let currentBusqueda = '';
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let debounceTimer = null;

function toggleFavorite(id) {
  const index = favorites.indexOf(id);
  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  document.querySelectorAll(`[data-fav-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('favorited');
    const icon = btn.querySelector('.material-symbols-outlined');
    icon.textContent = favorites.includes(id) ? 'favorite' : 'favorite_border';
  });
}

function isFavorite(id) {
  return favorites.includes(id);
}

function shareJob(empleo) {
  const text = `¡Mira este empleo en Chamba.com! ${empleo.titulo} - ${empleo.empresa} en ${empleo.departamento}`;
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({ title: empleo.titulo, text, url });
  } else {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="bg-white dark:bg-surface-dark border-[3px] border-black dark:border-white brutalist-card p-8 max-w-sm w-full" onclick="event.stopPropagation()">
        <h3 class="font-headline-md text-xl uppercase mb-6">Compartir empleo</h3>
        <div class="space-y-3">
          <a href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank" class="flex items-center gap-3 p-3 border-2 border-black dark:border-white hover:bg-green-500 hover:text-white transition-colors">
            <span class="material-symbols-outlined">chat</span> WhatsApp
          </a>
          <a href="mailto:?subject=${encodeURIComponent(empleo.titulo)}&body=${encodeURIComponent(text + '\n' + url)}" class="flex items-center gap-3 p-3 border-2 border-black dark:border-white hover:bg-blue-500 hover:text-white transition-colors">
            <span class="material-symbols-outlined">email</span> Email
          </a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" class="flex items-center gap-3 p-3 border-2 border-black dark:border-white hover:bg-sky-500 hover:text-white transition-colors">
            <span class="material-symbols-outlined">tag</span> Twitter/X
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="flex items-center gap-3 p-3 border-2 border-black dark:border-white hover:bg-blue-600 hover:text-white transition-colors">
            <span class="material-symbols-outlined">facebook</span> Facebook
          </a>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="w-full mt-6 brutalist-btn bg-primary text-on-primary px-6 py-3 font-label-bold uppercase text-sm">CERRAR</button>
      </div>`;
    document.body.appendChild(modal);
  }
}

function showLoading() {
  const grid = document.getElementById('empleos-list');
  grid.innerHTML = `
    <div class="text-center py-20">
      <div class="inline-block w-12 h-12 border-4 border-neutral-200 border-t-black rounded-full animate-spin"></div>
      <p class="text-secondary mt-4 font-label-bold uppercase text-sm">Cargando empleos...</p>
    </div>`;
}

async function cargarEmpleos(page = 1) {
  showLoading();

  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', 6);
  if (currentBusqueda) params.append('busqueda', currentBusqueda);
  if (currentCategoria) params.append('categoria', currentCategoria);
  if (currentDepartamento) params.append('departamentos', currentDepartamento);

  const res = await fetch(`${API_URL}?${params}`);
  const data = await res.json();

  document.getElementById('job-count').textContent = `${data.total} empleos encontrados`;
  renderEmpleos(data.empleos);
  renderPagination(data.page, data.totalPages, data.total);
}

function renderEmpleos(empleos) {
  const grid = document.getElementById('empleos-list');
  if (empleos.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-20">
        <span class="material-symbols-outlined text-[64px] text-neutral-300">search_off</span>
        <h3 class="font-headline-md text-2xl mt-4">No se encontraron empleos</h3>
        <p class="text-secondary mt-2">Intenta con otros filtros de búsqueda</p>
      </div>`;
    return;
  }

  grid.innerHTML = empleos.map(e => {
    const icon = ICONS[e.categoria] || 'work';
    const tag = TAGS[e.categoria] || 'EMPLEO';
    const fecha = formatDate(e.fecha_limite);
    const favClass = isFavorite(e.id) ? 'favorited' : '';
    const favIcon = isFavorite(e.id) ? 'favorite' : 'favorite_border';
    const expirado = e.expirado;
    const estadoBadge = expirado
      ? '<span class="bg-red-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">PLAZO CERRADO</span>'
      : '<span class="bg-green-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">ABIERTO</span>';
    const applyBtn = expirado
      ? `<button disabled class="flex-1 md:flex-none bg-neutral-300 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 px-8 py-4 font-label-bold uppercase cursor-not-allowed">CERRADO</button>`
      : `<button onclick="abrirEmpleo(${e.id})" class="flex-1 md:flex-none brutalist-btn bg-primary text-on-primary px-8 py-4 font-label-bold uppercase">APLICAR</button>`;
    const cardOpacity = expirado ? 'opacity-70' : '';
    return `
      <div class="bg-white dark:bg-surface-dark p-8 border-[3px] border-black dark:border-white brutalist-card flex flex-col md:flex-row items-center justify-between gap-6 group ${cardOpacity}">
        <div class="flex items-center gap-8 w-full md:w-auto cursor-pointer flex-1" onclick="abrirEmpleo(${e.id})">
          <div class="w-20 h-20 bg-neutral-100 dark:bg-neutral-700 border-2 border-black dark:border-white flex items-center justify-center grayscale group-hover:grayscale-0 transition-all">
            <span class="material-symbols-outlined text-[40px]">${icon}</span>
          </div>
          <div>
            <div class="flex gap-2 mb-2">
              <span class="bg-neutral-900 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">${tag}</span>
              <span class="bg-neutral-200 dark:bg-neutral-600 text-black dark:text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">${e.departamento}</span>
              ${estadoBadge}
            </div>
            <h4 class="font-headline-md text-2xl uppercase group-hover:underline decoration-[3px]">${e.titulo}</h4>
            <p class="text-secondary font-label-sm mt-1 uppercase tracking-wider">${e.empresa} • ${fecha}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 w-full md:w-auto">
          <button onclick="toggleFavorite(${e.id})" data-fav-id="${e.id}" class="fav-btn ${favClass} w-12 h-12 border-2 border-black dark:border-white flex items-center justify-center hover:bg-red-50 dark:hover:bg-neutral-700 transition-colors">
            <span class="material-symbols-outlined">${favIcon}</span>
          </button>
          <button onclick="shareJob({id:${e.id},titulo:'${e.titulo.replace(/'/g,"\\'")}',empresa:'${e.empresa.replace(/'/g,"\\'")}',departamento:'${e.departamento.replace(/'/g,"\\'")}'})" class="w-12 h-12 border-2 border-black dark:border-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <span class="material-symbols-outlined">share</span>
          </button>
          ${applyBtn}
        </div>
      </div>`;
  }).join('');
}

function renderPagination(current, total, totalItems) {
  const container = document.getElementById('pagination');
  if (!container || total <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = `<div class="flex items-center justify-center gap-4 mt-12">`;
  if (current > 1) {
    html += `<button onclick="goToPage(${current - 1})" class="brutalist-btn bg-white dark:bg-surface-dark px-6 py-3 font-label-bold uppercase text-sm border-2 border-black dark:border-white">← Anterior</button>`;
  }
  html += `<span class="font-label-bold text-secondary">Página ${current} de ${total}</span>`;
  if (current < total) {
    html += `<button onclick="goToPage(${current + 1})" class="brutalist-btn bg-white dark:bg-surface-dark px-6 py-3 font-label-bold uppercase text-sm border-2 border-black dark:border-white">Siguiente →</button>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  cargarEmpleos(page);
  document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
}

async function abrirEmpleo(id) {
  const res = await fetch(`${API_URL}/${id}`);
  const empleo = await res.json();
  const icon = ICONS[empleo.categoria] || 'work';
  const tag = TAGS[empleo.categoria] || 'EMPLEO';
  const fecha = formatDate(empleo.fecha_limite);
  const expirado = empleo.expirado;

  const estadoBadge = expirado
    ? '<span class="bg-red-600 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-tighter">PLAZO CERRADO</span>'
    : '<span class="bg-green-600 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-tighter">ABIERTO</span>';

  const formHTML = expirado
    ? `<div class="bg-red-50 border-[3px] border-red-600 p-6 text-center">
        <span class="material-symbols-outlined text-[48px] text-red-600">event_busy</span>
        <h3 class="font-headline-md text-xl mt-4 uppercase text-red-600">Plazo de postulación cerrado</h3>
        <p class="text-secondary mt-2">La fecha límite para aplicar a este empleo ya pasó.</p>
      </div>`
    : `<form id="postularForm" class="space-y-4">
        <input type="hidden" value="${empleo.id}" name="empleo_id"/>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="font-label-bold text-xs uppercase block mb-2">Nombre completo</label>
            <input type="text" name="nombre" required class="w-full px-4 py-3 border-[3px] border-black dark:border-white dark:bg-neutral-800 dark:text-white font-body-md focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"/>
          </div>
          <div>
            <label class="font-label-bold text-xs uppercase block mb-2">Email</label>
            <input type="email" name="email" required class="w-full px-4 py-3 border-[3px] border-black dark:border-white dark:bg-neutral-800 dark:text-white font-body-md focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"/>
          </div>
        </div>
        <div>
          <label class="font-label-bold text-xs uppercase block mb-2">Teléfono</label>
          <input type="tel" name="telefono" class="w-full px-4 py-3 border-[3px] border-black dark:border-white dark:bg-neutral-800 dark:text-white font-body-md focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none"/>
        </div>
        <div>
          <label class="font-label-bold text-xs uppercase block mb-2">Carta de presentación</label>
          <textarea name="carta" rows="4" class="w-full px-4 py-3 border-[3px] border-black dark:border-white dark:bg-neutral-800 dark:text-white font-body-md focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none resize-none" placeholder="Cuéntanos por qué eres el candidato ideal..."></textarea>
        </div>
        <button type="submit" class="w-full brutalist-btn bg-primary text-on-primary px-10 py-4 font-label-bold uppercase tracking-widest text-sm">ENVIAR POSTULACIÓN</button>
      </form>`;

  document.getElementById('modal-empleo').innerHTML = `
    <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
      <div class="bg-white dark:bg-surface-dark border-[3px] border-black dark:border-white brutalist-card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="p-8 border-b-[3px] border-black dark:border-white">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 border-2 border-black dark:border-white flex items-center justify-center">
                <span class="material-symbols-outlined text-[32px]">${icon}</span>
              </div>
              <div>
                <div class="flex gap-2 mb-2">
                  <span class="bg-neutral-900 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">${tag}</span>
                  <span class="bg-neutral-200 dark:bg-neutral-600 text-black dark:text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">${empleo.departamento}</span>
                  ${estadoBadge}
                </div>
                <h2 class="font-headline-md text-3xl uppercase">${empleo.titulo}</h2>
                <p class="text-secondary font-label-sm uppercase tracking-wider mt-1">${empleo.empresa}</p>
              </div>
            </div>
            <button onclick="cerrarModal()" class="w-10 h-10 border-2 border-black dark:border-white flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-700">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div class="p-8">
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">calendar_today</span>
              <span class="font-label-bold text-sm">Fecha límite: ${fecha}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">location_on</span>
              <span class="font-label-bold text-sm">${empleo.departamento}, Honduras</span>
            </div>
          </div>
          <div class="mb-8">
            <h3 class="font-label-bold uppercase text-sm mb-3">Descripción del puesto</h3>
            <p class="text-secondary leading-relaxed">${empleo.descripcion}</p>
          </div>
          <div class="flex gap-3 mb-8">
            <button onclick="shareJob({id:${empleo.id},titulo:'${empleo.titulo.replace(/'/g,"\\'")}',empresa:'${empleo.empresa.replace(/'/g,"\\'")}',departamento:'${empleo.departamento.replace(/'/g,"\\'")}'})" class="brutalist-btn bg-white dark:bg-surface-dark px-6 py-3 font-label-bold uppercase text-sm flex items-center gap-2">
              <span class="material-symbols-outlined">share</span> Compartir
            </button>
            <button onclick="toggleFavorite(${empleo.id})" class="brutalist-btn bg-white dark:bg-surface-dark px-6 py-3 font-label-bold uppercase text-sm flex items-center gap-2">
              <span class="material-symbols-outlined">${isFavorite(empleo.id) ? 'favorite' : 'favorite_border'}</span> Guardar
            </button>
          </div>
          ${formHTML}
        </div>
      </div>
    </div>`;

  document.getElementById('postularForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.empleo_id = parseInt(data.empleo_id);

    const postulacionesUrl = window.location.hostname.includes('netlify.app')
      ? '/.netlify/functions/postulaciones'
      : '/api/postulaciones';

    await fetch(postulacionesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    document.getElementById('modal-empleo').innerHTML = `
      <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
        <div class="bg-white dark:bg-surface-dark border-[3px] border-black dark:border-white brutalist-card max-w-md w-full text-center p-12" onclick="event.stopPropagation()">
          <span class="material-symbols-outlined text-[80px] text-green-600">check_circle</span>
          <h2 class="font-headline-md text-3xl mt-6 uppercase">¡Postulación enviada!</h2>
          <p class="text-secondary mt-3 mb-8">Tu aplicación ha sido enviada exitosamente</p>
          <button onclick="cerrarModal()" class="brutalist-btn bg-primary text-on-primary px-10 py-4 font-label-bold uppercase">CERRAR</button>
        </div>
      </div>`;
  });
}

function cerrarModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-empleo').innerHTML = '';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function filtrarCategoria(categoria) {
  currentCategoria = categoria;
  currentDepartamento = '';
  currentBusqueda = '';
  currentPage = 1;
  document.getElementById('busqueda').value = '';
  document.getElementById('categoria').value = categoria;
  document.getElementById('departamentos').value = '';
  cargarEmpleos(1);
  document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
}

function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentBusqueda = document.getElementById('busqueda').value;
    currentCategoria = document.getElementById('categoria').value;
    currentDepartamento = document.getElementById('departamentos').value;
    currentPage = 1;
    cargarEmpleos(1);
  }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
  cargarEmpleos(1);
  cargarCategorias();

  document.getElementById('btnBuscar').addEventListener('click', () => {
    currentBusqueda = document.getElementById('busqueda').value;
    currentCategoria = document.getElementById('categoria').value;
    currentDepartamento = document.getElementById('departamentos').value;
    currentPage = 1;
    cargarEmpleos(1);
    document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('busqueda').addEventListener('input', debounceSearch);
  document.getElementById('busqueda').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnBuscar').click();
  });

  document.getElementById('categoria').addEventListener('change', () => {
    document.getElementById('btnBuscar').click();
  });

  document.getElementById('departamentos').addEventListener('change', () => {
    document.getElementById('btnBuscar').click();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('opacity-100', 'translate-y-0');
        entry.target.classList.remove('opacity-0', 'translate-y-8');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.brutalist-card').forEach(el => {
    el.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-500');
    observer.observe(el);
  });
});

async function cargarCategorias() {
  const res = await fetch(`${API_URL}?limit=100`);
  const data = await res.json();
  const allEmpleos = data.empleos || data;

  const counts = {};
  allEmpleos.forEach(e => {
    counts[e.categoria] = (counts[e.categoria] || 0) + 1;
  });

  document.getElementById('cat-tech').textContent = counts['Informática y Programación'] || 0;
  document.getElementById('cat-ventas').textContent = counts['Ventas y Comercial'] || 0;
  document.getElementById('cat-ingenieria').textContent = counts['Ingeniería y Técnico'] || 0;
  document.getElementById('cat-finanzas').textContent = counts['Finanzas y Contabilidad'] || 0;
}
