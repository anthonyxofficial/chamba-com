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
  pink: 'job-pink',
  green: 'job-green',
  blue: 'job-blue'
};

let currentPage = 1;
let currentCategoria = '';
let currentDepartamento = '';
let currentBusqueda = '';
let favorites;
try {
  favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
} catch {
  favorites = [];
}

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

function toggleFavorite(id) {
  const index = favorites.indexOf(id);
  if (index === -1) favorites.push(id); else favorites.splice(index, 1);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  document.querySelectorAll(`[data-fav-id="${id}"]`).forEach(btn => {
    const icon = btn.querySelector('.material-symbols-outlined');
    icon.textContent = favorites.includes(id) ? 'favorite' : 'favorite_border';
    btn.classList.toggle('bg-red-500/10', favorites.includes(id));
    btn.classList.toggle('border-red-500', favorites.includes(id));
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
      <div class="bg-surface border-4 border-primary neo-shadow-lg p-8 max-w-sm w-full" onclick="event.stopPropagation()">
        <h3 class="font-headline-md text-xl uppercase mb-6 text-primary">Compartir empleo</h3>
        <div class="space-y-md">
          <a href="https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}" target="_blank" class="flex items-center gap-md p-md border-2 border-primary hover:bg-job-green hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">chat</span> WhatsApp
          </a>
          <a href="mailto:?subject=${encodeURIComponent(empleo.titulo)}&body=${encodeURIComponent(text + '\n' + url)}" class="flex items-center gap-md p-md border-2 border-primary hover:bg-job-blue hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">email</span> Email
          </a>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}" target="_blank" class="flex items-center gap-md p-md border-2 border-primary hover:bg-sky-500 hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">tag</span> Twitter/X
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="flex items-center gap-md p-md border-2 border-primary hover:bg-job-blue hover:text-white transition-colors font-label-bold uppercase text-sm">
            <span class="material-symbols-outlined">facebook</span> Facebook
          </a>
        </div>
        <button onclick="this.closest('.fixed').remove()" class="w-full mt-lg bg-primary text-on-primary px-lg py-md font-label-bold uppercase text-sm border-4 border-primary neo-shadow-active">CERRAR</button>
      </div>`;
    document.body.appendChild(modal);
  }
}

function showLoading() {
  const grid = document.getElementById('empleos-list');
  const skel = `
    <div class="border-4 border-primary p-lg neo-shadow">
      <div class="flex justify-between items-start mb-xl">
        <div class="skeleton w-16 h-16 border-2 border-primary"></div>
        <div class="skeleton w-20 h-6 border-2 border-primary"></div>
      </div>
      <div class="skeleton h-8 w-3/4 mb-sm border-2 border-primary"></div>
      <div class="skeleton h-5 w-1/2 mb-xl border-2 border-primary"></div>
      <div class="skeleton h-4 w-full mb-xs border-2 border-primary"></div>
      <div class="skeleton h-4 w-2/3 mb-xl border-2 border-primary"></div>
      <div class="flex gap-sm mt-lg">
        <div class="skeleton h-12 flex-1 border-2 border-primary"></div>
        <div class="skeleton h-12 flex-[2] border-2 border-primary"></div>
      </div>
    </div>`;
  grid.innerHTML = Array(6).fill(skel).join('');
}

function hideLoading() {
  const grid = document.getElementById('empleos-list');
  if (grid) grid.innerHTML = '<div class="text-center py-32 col-span-full"><p class="text-secondary font-label-bold uppercase text-sm">Error al cargar empleos</p></div>';
}

function getSalaryForJob(empleo) {
  if (empleo.salario) return empleo.salario;
  const salaries = ['L15k - L18k', 'L12k - L15k', 'L14k - L16k', 'L16k - L20k', 'L18k - L25k', 'L20k - L30k', 'L22k - L28k', 'L25k - L35k'];
  return salaries[empleo.id % salaries.length];
}

function getColorForJob(empleo) {
  if (empleo.color && COLOR_MAP[empleo.color]) return empleo.color;
  return ['pink', 'green', 'blue'][empleo.id % 3];
}

async function cargarEmpleos(page = 1) {
  showLoading();
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', 6);
  if (currentBusqueda) params.append('busqueda', currentBusqueda);
  if (currentCategoria) params.append('categoria', currentCategoria);
  if (currentDepartamento) params.append('departamentos', currentDepartamento);

  try {
    const res = await fetch(`${API_URL}?${params}`);
    if (!res.ok) throw new Error('Error al cargar empleos');
    const data = await res.json();

    const countEl = document.getElementById('job-count');
    if (countEl) countEl.textContent = `${data.total} empleos encontrados`;
    renderEmpleos(data.empleos || []);
    renderPagination(data.page, data.totalPages);
  } catch (err) {
    console.error(err);
    hideLoading();
  }
}

function renderEmpleos(empleos) {
  const grid = document.getElementById('empleos-list');
  if (!grid) return;
  if (empleos.length === 0) {
    grid.innerHTML = `
      <div class="text-center py-32 col-span-full">
        <span class="material-symbols-outlined text-[64px] text-secondary">search_off</span>
        <h3 class="font-headline-md text-xl mt-4 text-primary">No se encontraron empleos</h3>
        <p class="text-secondary mt-2 font-label-bold uppercase text-sm">Intenta con otros filtros de búsqueda</p>
      </div>`;
    return;
  }

  grid.innerHTML = empleos.map(e => {
    const color = getColorForJob(e);
    const salary = getSalaryForJob(e);
    const fecha = formatDate(e.fecha_limite);
    const favIcon = isFavorite(e.id) ? 'favorite' : 'favorite_border';
    const expirado = e.expirado;
    const accentColors = {
      pink: 'var(--ch-job-pink)',
      green: 'var(--ch-job-green)',
      blue: 'var(--ch-job-blue)'
    };
    const accentColor = accentColors[color];

    return `
      <div class="card-stagger depth-card bg-surface border-4 border-primary p-lg neo-shadow-hover transition-all group flex flex-col h-full" style="--card-accent: ${accentColor};">
        <div class="flex justify-between items-start mb-xl">
          <div class="w-16 h-16 border-4 overflow-hidden flex items-center justify-center" style="border-color: var(--card-accent); background: var(--card-accent);">
            <span class="material-symbols-outlined text-on-primary text-[32px]">${ICONS[e.categoria] || 'work'}</span>
          </div>
          <div class="flex flex-col items-end gap-xs">
            ${expirado ? '<span class="bg-error text-white font-label-sm text-label-sm uppercase px-sm py-xs border-2 border-primary font-bold">CERRADO</span>' : ''}
            <span class="text-on-primary font-label-sm text-label-sm uppercase px-sm py-xs border-2 border-primary" style="background: var(--card-accent);">${TAGS[e.categoria] || 'EMPLEO'}</span>
          </div>
        </div>
        <h3 class="font-display-xl text-3xl uppercase mb-sm leading-tight group-hover:translate-x-1 transition-transform text-on-background cursor-pointer" onclick="abrirEmpleo(${parseInt(e.id) || 0})">${escapeHtml(e.titulo)}</h3>
        <p class="font-label-bold text-label-bold uppercase text-on-surface-variant mb-xl">${escapeHtml(e.empresa)}</p>
        <div class="mt-auto pt-lg border-t-2 border-primary/20 space-y-md">
          <div class="flex items-center gap-md">
            <span class="material-symbols-outlined text-xl bg-surface p-1 border-2 text-primary" style="border-color: var(--card-accent); color: var(--card-accent);">location_on</span>
            <span class="font-label-bold text-label-sm uppercase text-on-background">${escapeHtml(e.departamento)}</span>
          </div>
          <div class="flex items-center gap-md">
            <span class="material-symbols-outlined text-xl bg-surface p-1 border-2 text-primary" style="border-color: var(--card-accent); color: var(--card-accent);">payments</span>
            <span class="font-label-bold text-label-sm uppercase text-on-background">${escapeHtml(salary)}</span>
          </div>
        </div>
        <div class="flex gap-sm mt-lg">
          <button onclick="toggleFavorite(${parseInt(e.id) || 0})" data-fav-id="${parseInt(e.id) || 0}" class="flex-1 py-lg border-4 font-label-bold text-label-bold uppercase bg-transparent text-primary hover:bg-primary hover:text-on-primary transition-all neo-shadow-active ${isFavorite(e.id) ? 'bg-red-500/10 border-red-500' : 'border-primary'}" style="${isFavorite(e.id) ? '' : 'border-color: var(--card-accent);'}">
            <span class="material-symbols-outlined text-lg align-middle">${favIcon}</span> Guardar
          </button>
          <button onclick="abrirEmpleo(${parseInt(e.id) || 0})" class="flex-[2] py-lg border-4 border-primary font-label-bold text-label-bold uppercase text-on-primary hover:bg-transparent hover:text-primary transition-all neo-shadow-active" style="background: var(--card-accent); border-color: var(--card-accent);">
            ${expirado ? 'CERRADO' : 'Postularme'}
          </button>
        </div>
      </div>`;
  }).join('');
  if (window.refreshCardStagger) window.refreshCardStagger();
  if (window.initCardTilt) window.initCardTilt();
}

function renderPagination(current, total) {
  const container = document.getElementById('pagination');
  if (!container || total <= 1) { if (container) container.innerHTML = ''; return; }

  let html = `<div class="flex items-center justify-center gap-md mt-xl">`;
  if (current > 1) {
    html += `<button onclick="goToPage(${current - 1})" class="bg-surface border-4 border-primary px-lg py-md font-label-bold uppercase text-sm neo-shadow transition-all hover:-translate-y-0.5 text-primary">← Anterior</button>`;
  }
  html += `<span class="font-label-bold text-secondary">Página ${current} de ${total}</span>`;
  if (current < total) {
    html += `<button onclick="goToPage(${current + 1})" class="bg-surface border-4 border-primary px-lg py-md font-label-bold uppercase text-sm neo-shadow transition-all hover:-translate-y-0.5 text-primary">Siguiente →</button>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  cargarEmpleos(page);
  document.getElementById('empleos')?.scrollIntoView({ behavior: 'smooth' });
}

async function abrirEmpleo(id) {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error('Empleo no encontrado');
    var empleo = await res.json();
  } catch (err) {
    console.error(err);
    document.getElementById('modal-empleo').innerHTML = `
      <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
        <div class="bg-surface border-4 border-primary neo-shadow-lg max-w-md w-full text-center p-12" onclick="event.stopPropagation()">
          <span class="material-symbols-outlined text-[80px] text-error">error</span>
          <h2 class="font-headline-md text-xl mt-lg uppercase text-primary">Error al cargar empleo</h2>
          <button onclick="cerrarModal()" class="mt-lg bg-primary text-on-primary px-xl py-lg font-label-bold uppercase border-4 border-primary neo-shadow transition-all hover:-translate-y-0.5">CERRAR</button>
        </div>
      </div>`;
    return;
  }
  const salary = getSalaryForJob(empleo);
  const fecha = formatDate(empleo.fecha_limite);
  const expirado = empleo.expirado;

  const formHTML = expirado
    ? `<div class="bg-error/10 border-4 border-error p-lg text-center">
        <span class="material-symbols-outlined text-[48px] text-error">event_busy</span>
        <h3 class="font-headline-md text-xl mt-4 uppercase text-error">Plazo de postulación cerrado</h3>
        <p class="text-secondary mt-2 font-label-bold uppercase text-sm">La fecha límite para aplicar ya pasó.</p>
      </div>`
    : `<form id="postularForm" class="space-y-lg">
        <input type="hidden" value="${parseInt(empleo.id) || 0}" name="empleo_id"/>
        <div class="grid grid-cols-2 gap-md">
          <div>
            <label class="font-label-bold text-xs uppercase block mb-sm text-primary">Nombre completo</label>
            <input type="text" name="nombre" required class="w-full px-md py-md border-4 border-primary bg-surface text-primary font-body-md focus:shadow-[4px_4px_0px_0px_var(--ch-stroke)] outline-none"/>
          </div>
          <div>
            <label class="font-label-bold text-xs uppercase block mb-sm text-primary">Email</label>
            <input type="email" name="email" required class="w-full px-md py-md border-4 border-primary bg-surface text-primary font-body-md focus:shadow-[4px_4px_0px_0px_var(--ch-stroke)] outline-none"/>
          </div>
        </div>
        <div>
          <label class="font-label-bold text-xs uppercase block mb-sm text-primary">Teléfono</label>
          <input type="tel" name="telefono" class="w-full px-md py-md border-4 border-primary bg-surface text-primary font-body-md focus:shadow-[4px_4px_0px_0px_var(--ch-stroke)] outline-none"/>
        </div>
        <div>
          <label class="font-label-bold text-xs uppercase block mb-sm text-primary">Carta de presentación</label>
          <textarea name="carta" rows="4" class="w-full px-md py-md border-4 border-primary bg-surface text-primary font-body-md focus:shadow-[4px_4px_0px_0px_var(--ch-stroke)] outline-none resize-none" placeholder="Cuéntanos por qué eres el candidato ideal..."></textarea>
        </div>
        <button type="submit" class="w-full bg-primary text-on-primary px-xl py-lg font-label-bold uppercase tracking-widest text-sm border-4 border-primary neo-shadow transition-all hover:-translate-y-0.5">ENVIAR POSTULACIÓN</button>
      </form>`;

  const shareData = JSON.stringify({id: empleo.id, titulo: empleo.titulo, empresa: empleo.empresa, departamento: empleo.departamento});

  document.getElementById('modal-empleo').innerHTML = `
    <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
      <div class="bg-surface border-4 border-primary neo-shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="p-lg border-b-4 border-primary">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-lg">
              <div class="w-16 h-16 border-4 border-primary overflow-hidden flex items-center justify-center bg-primary">
                <span class="material-symbols-outlined text-on-primary text-[32px]">${ICONS[empleo.categoria] || 'work'}</span>
              </div>
              <div>
                <span class="bg-inverse-surface text-on-primary font-label-sm text-label-sm uppercase px-sm py-xs border-2 border-primary">${TAGS[empleo.categoria] || 'EMPLEO'}</span>
                <h2 class="font-headline-md text-3xl uppercase text-primary mt-sm">${escapeHtml(empleo.titulo)}</h2>
                <p class="text-secondary font-label-bold uppercase tracking-wider mt-xs text-sm">${escapeHtml(empleo.empresa)}</p>
              </div>
            </div>
            <button onclick="cerrarModal()" class="w-10 h-10 border-4 border-primary flex items-center justify-center hover:bg-surface-variant transition-colors text-primary">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div class="p-lg">
          <div class="grid grid-cols-2 gap-md mb-lg">
            <div class="flex items-center gap-md">
              <span class="material-symbols-outlined text-secondary">calendar_today</span>
              <span class="font-label-bold text-sm text-primary">Fecha límite: ${escapeHtml(fecha)}</span>
            </div>
            <div class="flex items-center gap-md">
              <span class="material-symbols-outlined text-secondary">location_on</span>
              <span class="font-label-bold text-sm text-primary">${escapeHtml(empleo.departamento)}, Honduras</span>
            </div>
            <div class="flex items-center gap-md">
              <span class="material-symbols-outlined text-secondary">payments</span>
              <span class="font-label-bold text-sm text-primary">${escapeHtml(salary)}</span>
            </div>
          </div>
          <div class="mb-lg">
            <h3 class="font-label-bold uppercase text-sm mb-sm text-primary">Descripción del puesto</h3>
            <p class="text-secondary leading-relaxed">${escapeHtml(empleo.descripcion)}</p>
          </div>
          <div class="flex gap-md mb-lg">
            <button data-share='${shareData.replace(/'/g, "&#39;")}' onclick="shareJob(JSON.parse(this.dataset.share))" class="bg-surface border-4 border-primary px-lg py-md font-label-bold uppercase text-sm flex items-center gap-md neo-shadow transition-all hover:-translate-y-0.5 text-primary">
              <span class="material-symbols-outlined">share</span> Compartir
            </button>
            <button onclick="toggleFavorite(${parseInt(empleo.id) || 0})" class="bg-surface border-4 border-primary px-lg py-md font-label-bold uppercase text-sm flex items-center gap-md neo-shadow transition-all hover:-translate-y-0.5 text-primary">
              <span class="material-symbols-outlined">${isFavorite(empleo.id) ? 'favorite' : 'favorite_border'}</span> Guardar
            </button>
          </div>
          ${formHTML}
        </div>
      </div>
    </div>`;

  const postularForm = document.getElementById('postularForm');
  if (postularForm) {
    postularForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      data.empleo_id = parseInt(data.empleo_id);

      try {
        const res = await fetch('/api/postulaciones', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error al enviar postulación');
      } catch (err) {
        console.error(err);
      }

      document.getElementById('modal-empleo').innerHTML = `
        <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onclick="cerrarModal(event)">
          <div class="bg-surface border-4 border-primary neo-shadow-lg max-w-md w-full text-center p-12" onclick="event.stopPropagation()">
            <span class="material-symbols-outlined text-[80px] text-job-green">check_circle</span>
            <h2 class="font-headline-md text-3xl mt-lg uppercase text-primary">¡Postulación enviada!</h2>
            <p class="text-secondary mt-md mb-xl font-label-bold uppercase text-sm">Tu aplicación ha sido enviada exitosamente</p>
            <button onclick="cerrarModal()" class="bg-primary text-on-primary px-xl py-lg font-label-bold uppercase border-4 border-primary neo-shadow transition-all hover:-translate-y-0.5">CERRAR</button>
          </div>
        </div>`;
    });
  }
}

function cerrarModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('modal-empleo').innerHTML = '';
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function filtrarCategoria(categoria) {
  currentCategoria = categoria;
  currentDepartamento = '';
  currentBusqueda = '';
  currentPage = 1;
  cargarEmpleos(1);
  document.getElementById('empleos')?.scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarEmpleos(1);
  cargarCategorias();

  const urlParams = new URLSearchParams(window.location.search);
  const empleoId = urlParams.get('empleo');
  if (empleoId && !isNaN(parseInt(empleoId))) {
    setTimeout(() => abrirEmpleo(parseInt(empleoId)), 300);
    window.history.replaceState({}, '', window.location.pathname);
  }

  const heroSearchBtn = document.getElementById('btnBuscarHero');
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      currentBusqueda = document.getElementById('busqueda-hero').value;
      currentDepartamento = document.getElementById('departamentos-hero').value;
      currentPage = 1;
      cargarEmpleos(1);
      document.getElementById('empleos')?.scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('busqueda-hero')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') heroSearchBtn.click(); });
    document.getElementById('departamentos-hero')?.addEventListener('change', () => { heroSearchBtn.click(); });
  }

  const buscaBtn = document.getElementById('btnBuscar');
  if (buscaBtn) {
    buscaBtn.addEventListener('click', () => {
      currentBusqueda = document.getElementById('busqueda')?.value || '';
      currentCategoria = document.getElementById('categoria')?.value || '';
      currentDepartamento = document.getElementById('departamentos')?.value || '';
      currentPage = 1;
      cargarEmpleos(1);
      document.getElementById('empleos')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  document.querySelectorAll('.tag-search').forEach(tag => {
    tag.addEventListener('click', (e) => {
      e.preventDefault();
      const searchTerm = tag.dataset.tag;
      if (document.getElementById('busqueda-hero')) document.getElementById('busqueda-hero').value = searchTerm;
      currentBusqueda = searchTerm;
      currentPage = 1;
      cargarEmpleos(1);
      document.getElementById('empleos')?.scrollIntoView({ behavior: 'smooth' });
    });
  });
});

async function cargarCategorias() {
  try {
    const res = await fetch(`${API_URL}?limit=100`);
    const data = await res.json();
    const allEmpleos = data.empleos || data;
    const counts = {};
    allEmpleos.forEach(e => { counts[e.categoria] = (counts[e.categoria] || 0) + 1; });

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
    const servicioEl = document.getElementById('cat-servicio');
    const adminEl = document.getElementById('cat-admin');
    const rrhhEl = document.getElementById('cat-rrhh');
    const logisticaEl = document.getElementById('cat-logistica');
    if (servicioEl) servicioEl.textContent = counts['Servicio al Cliente'] || 0;
    if (adminEl) adminEl.textContent = counts['Administración de Empresas'] || 0;
    if (rrhhEl) rrhhEl.textContent = counts['Recursos Humanos'] || 0;
    if (logisticaEl) logisticaEl.textContent = counts['Logística, Almacén y Compras'] || 0;
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}
