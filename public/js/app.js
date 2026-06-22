const API_URL = '/api/empleos';

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

const COLOR_MAP = {
  pink: { bg: 'bg-job-pink', border: 'border-job-pink', tag: 'bg-job-pink' },
  green: { bg: 'bg-job-green', border: 'border-job-green', tag: 'bg-job-green' },
  blue: { bg: 'bg-job-blue', border: 'border-job-blue', tag: 'bg-job-blue' }
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
    const icon = btn.querySelector('.material-symbols-outlined');
    icon.textContent = favorites.includes(id) ? 'favorite' : 'favorite_border';
    icon.classList.toggle('text-job-pink', favorites.includes(id));
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
      <div class="bg-surface border-4 border-outline neo-shadow-lg p-8 max-w-sm w-full" onclick="event.stopPropagation()">
        <h3 class="font-headline-md text-xl uppercase mb-6 text-primary">Compartir empleo</h3>
        <div class="space-y-3">
          <a href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank" class="flex items-center gap-3 p-3 border-2 border-outline hover:bg-job-green hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">chat</span> WhatsApp
          </a>
          <a href="mailto:?subject=${encodeURIComponent(empleo.titulo)}&body=${encodeURIComponent(text + '\n' + url)}" class="flex items-center gap-3 p-3 border-2 border-outline hover:bg-job-blue hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">email</span> Email
          </a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" class="flex items-center gap-3 p-3 border-2 border-outline hover:bg-sky-500 hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">tag</span> Twitter/X
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="flex items-center gap-3 p-3 border-2 border-outline hover:bg-job-blue hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">facebook</span> Facebook
          </a>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="w-full mt-6 bg-primary text-on-primary px-6 py-3 font-label-bold uppercase text-sm border-2 border-outline neo-shadow-active">CERRAR</button>
      </div>`;
    document.body.appendChild(modal);
  }
}

function showLoading() {
  const grid = document.getElementById('empleos-list');
  grid.innerHTML = `
    <div class="text-center py-20 col-span-full">
      <div class="inline-block w-12 h-12 border-4 border-outline border-t-primary rounded-full animate-spin"></div>
      <p class="text-secondary mt-4 font-label-bold uppercase text-sm">Cargando empleos...</p>
    </div>`;
}

function getSalaryForJob(empleo) {
  if (empleo.salario) return empleo.salario;
  const salaries = [
    'L15k - L25k', 'L18k - L28k', 'L20k - L30k', 'L12k - L20k',
    'L22k - L35k', 'L16k - L26k', 'L19k - L29k', 'L25k - L40k'
  ];
  return salaries[empleo.id % salaries.length];
}

function getColorForJob(empleo) {
  if (empleo.color && COLOR_MAP[empleo.color]) return empleo.color;
  const colors = ['pink', 'green', 'blue'];
  return colors[empleo.id % 3];
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

  const countEl = document.getElementById('job-count');
  if (countEl) countEl.textContent = `${data.total} empleos encontrados`;
  renderEmpleos(data.empleos);
  renderPagination(data.page, data.totalPages, data.total);
}

function renderEmpleos(empleos) {
  const grid = document.getElementById('empleos-list');
  if (empleos.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-20 col-span-full">
        <span class="material-symbols-outlined text-[64px] text-outline">search_off</span>
        <h3 class="font-headline-md text-2xl mt-4 text-primary">No se encontraron empleos</h3>
        <p class="text-secondary mt-2 font-label-bold uppercase text-sm">Intenta con otros filtros de búsqueda</p>
      </div>`;
    return;
  }

  grid.innerHTML = empleos.map(e => {
    const color = getColorForJob(e);
    const salary = getSalaryForJob(e);
    const fecha = formatDate(e.fecha_limite);
    const favIcon = isFavorite(e.id) ? 'favorite' : 'favorite_border';
    const favColor = isFavorite(e.id) ? 'text-job-pink' : '';
    const expirado = e.expirado;
    const borderColor = expirado ? 'border-outline opacity-60' : `border-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'}`;
    const estadoBadge = expirado
      ? '<span class="bg-error text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">PLAZO CERRADO</span>'
      : '';

    return `
      <div class="bg-surface border-4 ${borderColor} neo-shadow p-6 flex flex-col group transition-all hover:-translate-y-1">
        <div class="flex items-center justify-between mb-4">
          <div class="w-14 h-14 bg-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'}/20 flex items-center justify-center border-2 border-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'}">
            <span class="material-symbols-outlined text-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'} text-[28px]">${ICONS[e.categoria] || 'work'}</span>
          </div>
          <div class="flex gap-2">
            <button onclick="toggleFavorite(${e.id})" data-fav-id="${e.id}" class="w-10 h-10 border-2 border-outline flex items-center justify-center hover:border-job-pink transition-colors">
              <span class="material-symbols-outlined text-[20px] ${favColor}">${favIcon}</span>
            </button>
            <button onclick="shareJob({id:${e.id},titulo:'${e.titulo.replace(/'/g,"\\'")}',empresa:'${e.empresa.replace(/'/g,"\\'")}',departamento:'${e.departamento.replace(/'/g,"\\'")}'})" class="w-10 h-10 border-2 border-outline flex items-center justify-center hover:border-primary transition-colors">
              <span class="material-symbols-outlined text-[20px]">share</span>
            </button>
          </div>
        </div>
        <div class="flex-1">
          <div class="flex gap-2 mb-3 flex-wrap">
            <span class="bg-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'} text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">${TAGS[e.categoria] || 'EMPLEO'}</span>
            <span class="bg-surface-variant text-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter border border-outline">${e.departamento}</span>
            ${estadoBadge}
          </div>
          <h4 class="font-headline-md text-xl uppercase text-primary group-hover:underline decoration-2 mb-2 cursor-pointer" onclick="abrirEmpleo(${e.id})">${e.titulo}</h4>
          <p class="font-label-bold text-label-sm uppercase tracking-wider text-secondary mb-3">${e.empresa}</p>
        </div>
        <div class="flex items-center justify-between pt-4 border-t-2 border-outline">
          <span class="font-label-bold text-label-sm text-primary">${salary}</span>
          <button onclick="abrirEmpleo(${e.id})" class="bg-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'} text-white px-4 py-2 font-label-bold uppercase text-xs border-2 border-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'} neo-shadow transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none">
            ${expirado ? 'CERRADO' : 'VER DETALLE'}
          </button>
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
    html += `<button onclick="goToPage(${current - 1})" class="bg-surface border-2 border-outline px-6 py-3 font-label-bold uppercase text-sm neo-shadow transition-all hover:-translate-y-0.5 text-primary">← Anterior</button>`;
  }
  html += `<span class="font-label-bold text-secondary">Página ${current} de ${total}</span>`;
  if (current < total) {
    html += `<button onclick="goToPage(${current + 1})" class="bg-surface border-2 border-outline px-6 py-3 font-label-bold uppercase text-sm neo-shadow transition-all hover:-translate-y-0.5 text-primary">Siguiente →</button>`;
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
  const color = getColorForJob(empleo);
  const salary = getSalaryForJob(empleo);
  const fecha = formatDate(empleo.fecha_limite);
  const expirado = empleo.expirado;

  const estadoBadge = expirado
    ? '<span class="bg-error text-white px-3 py-1 text-[10px] font-bold uppercase tracking-tighter">PLAZO CERRADO</span>'
    : '';

  const formHTML = expirado
    ? `<div class="bg-error/10 border-4 border-error p-6 text-center">
        <span class="material-symbols-outlined text-[48px] text-error">event_busy</span>
        <h3 class="font-headline-md text-xl mt-4 uppercase text-error">Plazo de postulación cerrado</h3>
        <p class="text-secondary mt-2 font-label-bold uppercase text-sm">La fecha límite para aplicar a este empleo ya pasó.</p>
      </div>`
    : `<form id="postularForm" class="space-y-4">
        <input type="hidden" value="${empleo.id}" name="empleo_id"/>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="font-label-bold text-xs uppercase block mb-2 text-primary">Nombre completo</label>
            <input type="text" name="nombre" required class="w-full px-4 py-3 border-4 border-outline bg-surface-variant text-primary font-body-md focus:border-primary outline-none transition-colors"/>
          </div>
          <div>
            <label class="font-label-bold text-xs uppercase block mb-2 text-primary">Email</label>
            <input type="email" name="email" required class="w-full px-4 py-3 border-4 border-outline bg-surface-variant text-primary font-body-md focus:border-primary outline-none transition-colors"/>
          </div>
        </div>
        <div>
          <label class="font-label-bold text-xs uppercase block mb-2 text-primary">Teléfono</label>
          <input type="tel" name="telefono" class="w-full px-4 py-3 border-4 border-outline bg-surface-variant text-primary font-body-md focus:border-primary outline-none transition-colors"/>
        </div>
        <div>
          <label class="font-label-bold text-xs uppercase block mb-2 text-primary">Carta de presentación</label>
          <textarea name="carta" rows="4" class="w-full px-4 py-3 border-4 border-outline bg-surface-variant text-primary font-body-md focus:border-primary outline-none resize-none" placeholder="Cuéntanos por qué eres el candidato ideal..."></textarea>
        </div>
        <button type="submit" class="w-full bg-primary text-on-primary px-10 py-4 font-label-bold uppercase tracking-widest text-sm border-4 border-outline neo-shadow transition-all hover:-translate-y-0.5 hover:shadow-none">ENVIAR POSTULACIÓN</button>
      </form>`;

  document.getElementById('modal-empleo').innerHTML = `
    <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
      <div class="bg-surface border-4 border-outline neo-shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="p-8 border-b-4 border-outline">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 bg-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'}/20 flex items-center justify-center border-2 border-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'}">
                <span class="material-symbols-outlined text-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'} text-[32px]">${ICONS[empleo.categoria] || 'work'}</span>
              </div>
              <div>
                <div class="flex gap-2 mb-2 flex-wrap">
                  <span class="bg-${color === 'pink' ? 'job-pink' : color === 'green' ? 'job-green' : 'job-blue'} text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter">${TAGS[empleo.categoria] || 'EMPLEO'}</span>
                  <span class="bg-surface-variant text-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter border border-outline">${empleo.departamento}</span>
                  ${estadoBadge}
                </div>
                <h2 class="font-headline-md text-3xl uppercase text-primary">${empleo.titulo}</h2>
                <p class="text-secondary font-label-bold uppercase tracking-wider mt-1 text-sm">${empleo.empresa}</p>
              </div>
            </div>
            <button onclick="cerrarModal()" class="w-10 h-10 border-4 border-outline flex items-center justify-center hover:bg-surface-variant transition-colors text-primary">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div class="p-8">
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">calendar_today</span>
              <span class="font-label-bold text-sm text-primary">Fecha límite: ${fecha}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">location_on</span>
              <span class="font-label-bold text-sm text-primary">${empleo.departamento}, Honduras</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary">payments</span>
              <span class="font-label-bold text-sm text-primary">${salary}</span>
            </div>
          </div>
          <div class="mb-8">
            <h3 class="font-label-bold uppercase text-sm mb-3 text-primary">Descripción del puesto</h3>
            <p class="text-secondary leading-relaxed">${empleo.descripcion}</p>
          </div>
          <div class="flex gap-3 mb-8">
            <button onclick="shareJob({id:${empleo.id},titulo:'${empleo.titulo.replace(/'/g,"\\'")}',empresa:'${empleo.empresa.replace(/'/g,"\\'")}',departamento:'${empleo.departamento.replace(/'/g,"\\'")}'})" class="bg-surface border-2 border-outline px-6 py-3 font-label-bold uppercase text-sm flex items-center gap-2 neo-shadow transition-all hover:-translate-y-0.5 text-primary">
              <span class="material-symbols-outlined">share</span> Compartir
            </button>
            <button onclick="toggleFavorite(${empleo.id})" class="bg-surface border-2 border-outline px-6 py-3 font-label-bold uppercase text-sm flex items-center gap-2 neo-shadow transition-all hover:-translate-y-0.5 text-primary">
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

    await fetch('/api/postulaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    document.getElementById('modal-empleo').innerHTML = `
      <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
        <div class="bg-surface border-4 border-outline neo-shadow-lg max-w-md w-full text-center p-12" onclick="event.stopPropagation()">
          <span class="material-symbols-outlined text-[80px] text-job-green">check_circle</span>
          <h2 class="font-headline-md text-3xl mt-6 uppercase text-primary">¡Postulación enviada!</h2>
          <p class="text-secondary mt-3 mb-8 font-label-bold uppercase text-sm">Tu aplicación ha sido enviada exitosamente</p>
          <button onclick="cerrarModal()" class="bg-primary text-on-primary px-10 py-4 font-label-bold uppercase border-4 border-outline neo-shadow transition-all hover:-translate-y-0.5">CERRAR</button>
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
  cargarEmpleos(1);
  document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
}

function debounceSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentBusqueda = document.getElementById('busqueda-hero')?.value || document.getElementById('busqueda')?.value || '';
    currentDepartamento = document.getElementById('departamentos-hero')?.value || document.getElementById('departamentos')?.value || '';
    currentPage = 1;
    cargarEmpleos(1);
  }, 400);
}

document.addEventListener('DOMContentLoaded', () => {
  cargarEmpleos(1);
  cargarCategorias();

  const heroSearchBtn = document.getElementById('btnBuscarHero');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      currentBusqueda = document.getElementById('busqueda-hero').value;
      currentDepartamento = document.getElementById('departamentos-hero').value;
      currentPage = 1;
      cargarEmpleos(1);
      document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('busqueda-hero')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') heroSearchBtn.click();
    });

    document.getElementById('departamentos-hero')?.addEventListener('change', () => {
      heroSearchBtn.click();
    });
  }

  const buscaBtn = document.getElementById('btnBuscar');
  if (buscaBtn) {
    buscaBtn.addEventListener('click', () => {
      currentBusqueda = document.getElementById('busqueda')?.value || '';
      currentCategoria = document.getElementById('categoria')?.value || '';
      currentDepartamento = document.getElementById('departamentos')?.value || '';
      currentPage = 1;
      cargarEmpleos(1);
      document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
    });
  }

  document.querySelectorAll('.tag-search').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const searchTerm = tag.dataset.tag;
      if (document.getElementById('busqueda-hero')) {
        document.getElementById('busqueda-hero').value = searchTerm;
      }
      currentBusqueda = searchTerm;
      currentPage = 1;
      cargarEmpleos(1);
      document.getElementById('empleos').scrollIntoView({ behavior: 'smooth' });
    });
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
  try {
    const res = await fetch(`${API_URL}?limit=100`);
    const data = await res.json();
    const allEmpleos = data.empleos || data;

    const counts = {};
    allEmpleos.forEach(e => {
      counts[e.categoria] = (counts[e.categoria] || 0) + 1;
    });

    const techEl = document.getElementById('cat-tech');
    const ventasEl = document.getElementById('cat-ventas');
    const ingenieriaEl = document.getElementById('cat-ingenieria');
    const finanzasEl = document.getElementById('cat-finanzas');
    const marketingEl = document.getElementById('cat-marketing');

    if (techEl) techEl.textContent = counts['Informática y Programación'] || 0;
    if (ventasEl) ventasEl.textContent = counts['Ventas y Comercial'] || 0;
    if (ingenieriaEl) ingenieriaEl.textContent = counts['Ingeniería y Técnico'] || 0;
    if (finanzasEl) finanzasEl.textContent = counts['Finanzas y Contabilidad'] || 0;
    if (marketingEl) marketingEl.textContent = counts['Marketing y Comunicación'] || 0;
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}
