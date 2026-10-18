const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');

const store = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET no está configurado. Define la variable de entorno JWT_SECRET.');
    process.exit(1);
  }
  console.warn('ADVERTENCIA: JWT_SECRET no configurado, usando secreto temporal (solo desarrollo).');
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
}

// Security headers (CSP estricta: sin CDN, sin unsafe-eval)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src": ["'self'"],
      // Se conserva 'unsafe-inline' porque el sitio usa onclick en HTML y <style> por página.
      // Queda PROHIBIDO cargar scripts desde dominios externos.
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://images.unsplash.com"],
      "connect-src": ["'self'", "https://chamba-com.onrender.com", "http://localhost:3000"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS restringido (dominios propios + deploys + env ALLOWED_ORIGINS)
const ALLOWED_ORIGINS = ['https://chamba.com', 'http://localhost:3000'];
if (process.env.ALLOWED_ORIGINS) {
  ALLOWED_ORIGINS.push(...process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean));
}
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    if (/\.onrender\.com$/.test(origin) || /\.netlify\.app$/.test(origin)) return cb(null, true);
    return cb(new Error('Origen no permitido por CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const postLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

const empleosWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas solicitudes. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

// --- Helpers ---
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isExpired(fechaLimite) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaLimite);
  if (isNaN(fecha.getTime())) return false;
  fecha.setHours(0, 0, 0, 0);
  return fecha < hoy;
}

function addExpirationStatus(empleo) {
  return {
    ...empleo,
    expirado: isExpired(empleo.fecha_limite),
    estado: isExpired(empleo.fecha_limite) ? 'Cerrado' : 'Abierto'
  };
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

function truncate(str, max) {
  if (typeof str !== 'string') return '';
  return str.length > max ? str.slice(0, max) : str;
}

function escapeForHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function placeholderVal(val) {
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  return str.replace(/</g, '\\u003c');
}

const CATEGORIA_TAGS = {
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

const CATEGORIA_ICONS = {
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

function formatDateEs(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function injectPlaceholder(html, token, value) {
  return html.split(token).join(value == null ? '' : value);
}

// --- Auth Middleware ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {}
  }
  next();
}

function employerOnly(req, res, next) {
  if (!req.user || req.user.tipo !== 'empresa') {
    return res.status(403).json({ error: 'Solo empresas pueden realizar esta acción' });
  }
  next();
}

// --- Empleos ---
app.get('/api/empleos', optionalAuth, async (req, res) => {
  const todos = await store.getAll('empleos');
  const { busqueda, categoria, departamentos, page = 1, limit = 10, solo_abiertos } = req.query;
  let empleos = todos;

  if (solo_abiertos === 'true') {
    empleos = empleos.filter(e => !isExpired(e.fecha_limite));
  }

  if (busqueda) {
    const term = busqueda.toLowerCase();
    empleos = empleos.filter(e =>
      e.titulo.toLowerCase().includes(term) ||
      e.empresa.toLowerCase().includes(term) ||
      (e.descripcion && e.descripcion.toLowerCase().includes(term))
    );
  }
  if (categoria) empleos = empleos.filter(e => e.categoria === categoria);
  if (departamentos) empleos = empleos.filter(e => e.departamento === departamentos);

  const total = empleos.length;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const start = (pageNum - 1) * limitNum;
  const paginated = empleos.slice(start, start + limitNum).map(addExpirationStatus);

  res.json({
    empleos: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum)
  });
});

app.get('/api/empleos/mios', authMiddleware, employerOnly, async (req, res) => {
  const empleos = (await store.getAll('empleos')).filter(e => e.empresa_id === req.user.id);
  res.json({ empleos: empleos.map(addExpirationStatus), total: empleos.length });
});

app.get('/api/empleos/:id', optionalAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleo = (await store.getAll('empleos')).find(e => e.id === id);
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });
  res.json(addExpirationStatus(empleo));
});

app.post('/api/empleos', authMiddleware, employerOnly, empleosWriteLimiter, async (req, res) => {
  const { titulo, empresa, categoria, departamento, descripcion, fecha_limite, salario } = req.body;

  if (!titulo || !empresa || !categoria || !departamento || !fecha_limite) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const limite = new Date(fecha_limite);
  if (isNaN(limite.getTime())) {
    return res.status(400).json({ error: 'fecha_limite inválida (usa YYYY-MM-DD)' });
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  if (limite < hoy) {
    return res.status(400).json({ error: 'fecha_limite debe ser hoy o una fecha futura' });
  }

  const nuevoEmpleo = {
    id: await store.nextId('empleos'),
    titulo: truncate(sanitize(titulo), 200),
    empresa: truncate(sanitize(empresa), 100),
    categoria: truncate(sanitize(categoria), 100),
    departamento: truncate(sanitize(departamento), 100),
    descripcion: truncate(sanitize(descripcion || ''), 2000),
    salario: truncate(sanitize(salario || ''), 50),
    fecha_limite,
    empresa_id: req.user.id,
    createdAt: new Date().toISOString()
  };
  await store.insert('empleos', nuevoEmpleo);
  res.status(201).json(nuevoEmpleo);
});

app.put('/api/empleos/:id', authMiddleware, employerOnly, empleosWriteLimiter, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleo = (await store.getAll('empleos')).find(e => e.id === id);
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });

  if (!empleo.empresa_id) {
    return res.status(403).json({ error: 'Este empleo no se puede editar' });
  }
  if (empleo.empresa_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para editar este empleo' });
  }

  if (req.body.fecha_limite !== undefined && isNaN(new Date(req.body.fecha_limite).getTime())) {
    return res.status(400).json({ error: 'fecha_limite inválida (usa YYYY-MM-DD)' });
  }

  const allowed = ['titulo', 'empresa', 'categoria', 'departamento', 'descripcion', 'fecha_limite', 'salario'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const maxLen = key === 'descripcion' ? 2000 : key === 'titulo' ? 200 : key === 'salario' ? 50 : 100;
      updates[key] = truncate(sanitize(req.body[key]), maxLen);
    }
  }

  const actualizado = await store.update('empleos', id, updates);
  res.json(actualizado);
});

app.delete('/api/empleos/:id', authMiddleware, employerOnly, empleosWriteLimiter, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleo = (await store.getAll('empleos')).find(e => e.id === id);
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });

  if (!empleo.empresa_id) {
    return res.status(403).json({ error: 'Este empleo no se puede eliminar' });
  }
  if (empleo.empresa_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este empleo' });
  }

  await store.remove('empleos', id);
  res.json({ success: true });
});

// --- Auth ---
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, nombre, tipo } = req.body;

  if (!email || !password || !nombre || !tipo) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return res.status(400).json({ error: 'La contraseña debe contener al menos 1 mayúscula y 1 número' });
  }

  if (!['aspirante', 'empresa'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de cuenta inválido' });
  }

  const users = await store.getAll('users');
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = {
    id: await store.nextId('users'),
    email,
    password: hashedPassword,
    nombre: truncate(sanitize(nombre), 100),
    tipo,
    createdAt: new Date().toISOString()
  };
  await store.insert('users', newUser);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, nombre: newUser.nombre, tipo: newUser.tipo },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({ token, user: { id: newUser.id, email, nombre: newUser.nombre, tipo } });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const user = (await store.getAll('users')).find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre, tipo: user.tipo },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, tipo: user.tipo } });
});

// --- Postulaciones ---
app.post('/api/postulaciones', authMiddleware, postLimiter, async (req, res) => {
  const { empleo_id, nombre, email, carta } = req.body;

  if (!empleo_id || !nombre || !email) {
    return res.status(400).json({ error: 'empleo_id, nombre y email son requeridos' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const empleoId = parseInt(empleo_id);
  if (isNaN(empleoId)) {
    return res.status(400).json({ error: 'empleo_id inválido' });
  }

  const empleo = (await store.getAll('empleos')).find(e => e.id === empleoId);
  if (!empleo) {
    return res.status(404).json({ error: 'Empleo no encontrado' });
  }
  if (isExpired(empleo.fecha_limite)) {
    return res.status(400).json({ error: 'El plazo de postulación para este empleo ya cerró' });
  }

  const postulaciones = await store.getAll('postulaciones');
  if (postulaciones.find(p => p.empleo_id === empleoId && p.aspirante_id === req.user.id)) {
    return res.status(409).json({ error: 'Ya te postulaste a este empleo' });
  }
  const newPost = {
    id: await store.nextId('postulaciones'),
    empleo_id: empleoId,
    nombre: truncate(sanitize(nombre), 100),
    email,
    telefono: truncate(req.body.telefono || '', 20),
    carta: truncate(sanitize(carta || ''), 2000),
    aspirante_id: req.user.id,
    createdAt: new Date().toISOString()
  };
  await store.insert('postulaciones', newPost);
  res.status(201).json(newPost);
});

app.get('/api/postulaciones', authMiddleware, employerOnly, async (req, res) => {
  const postulaciones = await store.getAll('postulaciones');
  const empleos = await store.getAll('empleos');
  const { empleo_id } = req.query;

  const myEmpleoIds = empleos
    .filter(e => e.empresa_id === req.user.id)
    .map(e => e.id);

  let filtered = postulaciones.filter(p => myEmpleoIds.includes(p.empleo_id));

  if (empleo_id) {
    const eid = parseInt(empleo_id);
    if (!myEmpleoIds.includes(eid)) {
      return res.status(403).json({ error: 'No tienes permiso para ver estas postulaciones' });
    }
    filtered = filtered.filter(p => p.empleo_id === eid);
  }

  res.json(filtered);
});

// --- Contacto ---
app.post('/api/contacto', postLimiter, async (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;
  if (!nombre || !email || !asunto || !mensaje) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  const contacto = {
    id: await store.nextId('contacto'),
    nombre: truncate(sanitize(nombre), 100),
    email,
    asunto: truncate(sanitize(asunto), 200),
    mensaje: truncate(sanitize(mensaje), 2000),
    createdAt: new Date().toISOString()
  };
  await store.insert('contacto', contacto);
  res.status(201).json({ success: true });
});

// --- Health Check ---
app.get('/api/health', async (req, res) => {
  const empleos = await store.getAll('empleos');
  const users = await store.getAll('users');
  const postulaciones = await store.getAll('postulaciones');
  const contactos = await store.getAll('contacto');
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    storage: store.getMode(),
    counts: {
      empleos: empleos.length,
      users: users.length,
      postulaciones: postulaciones.length,
      contactos: contactos.length
    }
  });
});

// --- Página de detalle de empleo (server-renderizada para SEO) ---
app.get('/empleo/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const empleo = isNaN(id) ? null : (await store.getAll('empleos')).find(e => e.id === id);
    if (!empleo) {
      return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }

    const expirado = isExpired(empleo.fecha_limite);
    const canonical = `https://chamba-com.onrender.com/empleo/${empleo.id}`;
    const pageTitle = `${empleo.titulo} – ${empleo.empresa} (${empleo.departamento}) | CHAMBA`;
    const metaDesc = truncate(empleo.descripcion || '', 158).trim()
      || `Postula como ${empleo.titulo} en ${empleo.empresa} (${empleo.departamento}) y encuentra más empleos en Honduras en CHAMBA.`;

    const limite = new Date(empleo.fecha_limite);
    const jobPosting = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      'title': empleo.titulo,
      'description': empleo.descripcion || '',
      datePosted: empleo.createdAt,
      hiringOrganization: {
        '@type': 'Organization',
        name: empleo.empresa,
        sameAs: 'https://chamba-com.onrender.com/'
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: empleo.departamento,
          addressCountry: 'HN'
        }
      },
      directApply: true
    };
    if (!isNaN(limite.getTime())) {
      jobPosting.validThrough = new Date(empleo.fecha_limite + 'T23:59:59Z').toISOString();
    }

    const tagLabel = CATEGORIA_TAGS[empleo.categoria] || (empleo.categoria || '').toUpperCase() || 'EMPLEO';
    const icono = CATEGORIA_ICONS[empleo.categoria] || 'work';

    const shareObj = { id: empleo.id, titulo: empleo.titulo, empresa: empleo.empresa, departamento: empleo.departamento };
    const shareJson = escapeForHtml(JSON.stringify(shareObj));

    const ctaHtml = expirado
      ? `<span class="bg-error/10 border-4 border-error px-xl py-lg font-label-bold uppercase text-sm text-error inline-flex items-center gap-md">
           <span class="material-symbols-outlined">event_busy</span> PLAZO DE POSTULACIÓN CERRADO
         </span>
         <a href="/buscar.html" class="active-scale bg-primary text-on-primary px-xl py-lg font-label-bold uppercase text-sm border-4 border-primary neo-shadow neo-shadow-active inline-flex items-center">VER MÁS EMPLEOS</a>`
      : `<button onclick="abrirEmpleo(${empleo.id})" class="active-scale bg-primary text-on-primary px-xl py-lg font-label-bold uppercase text-sm border-4 border-primary neo-shadow neo-shadow-active inline-flex items-center">
           <span class="material-symbols-outlined">send</span> POSTULARME
         </button>
         <button onclick="toggleFavorite(${empleo.id})" data-fav-id="${empleo.id}" class="bg-surface border-4 border-primary px-lg py-lg font-label-bold uppercase text-sm inline-flex items-center gap-md neo-shadow neo-shadow-active text-primary">
           <span class="material-symbols-outlined" data-fav-icon="${empleo.id}">favorite_border</span> GUARDAR
         </button>`;

    const estadoHtml = expirado
      ? `<span class="bg-error text-white font-label-sm text-label-sm uppercase px-sm py-xs border-2 border-primary font-bold">CERRADO</span>`
      : `<span class="bg-job-green text-white font-label-sm text-label-sm uppercase px-sm py-xs border-2 border-primary font-bold">ABIERTO</span>`;

    const descHtml = (empleo.descripcion || '').trim()
      ? empleo.descripcion.trim().split(/\r?\n+/).filter(Boolean)
          .map(p => `<p class="text-secondary leading-relaxed mb-md">${escapeForHtml(p)}</p>`).join('')
      : '<p class="text-secondary leading-relaxed">Sin descripción disponible.</p>';

    let html = await fs.promises.readFile(path.join(__dirname, 'public', 'empleo.html'), 'utf8');

    html = injectPlaceholder(html, '{{TAG}}', escapeForHtml(tagLabel));
    html = injectPlaceholder(html, '{{ICONO}}', icono);
    html = injectPlaceholder(html, '{{ESTADO_HTML}}', estadoHtml);
    html = injectPlaceholder(html, '{{TITULO}}', escapeForHtml(empleo.titulo));
    html = injectPlaceholder(html, '{{EMPRESA}}', escapeForHtml(empleo.empresa));
    html = injectPlaceholder(html, '{{DEPARTAMENTO}}', escapeForHtml(empleo.departamento));
    html = injectPlaceholder(html, '{{SALARIO}}', escapeForHtml(empleo.salario || 'A convenir'));
    html = injectPlaceholder(html, '{{FECHA}}', escapeForHtml(formatDateEs(empleo.fecha_limite)));
    html = injectPlaceholder(html, '{{DESCRIPCION_HTML}}', descHtml);
    html = injectPlaceholder(html, '{{CTA_HTML}}', ctaHtml);
    html = injectPlaceholder(html, '{{SHARE_JSON}}', shareJson);
    html = injectPlaceholder(html, '{{ID}}', String(empleo.id));

    html = injectPlaceholder(html, '{{PAGE_TITLE}}', escapeForHtml(pageTitle));
    html = injectPlaceholder(html, '{{META_DESC}}', escapeForHtml(metaDesc));
    html = injectPlaceholder(html, '{{OG_DESC}}', escapeForHtml(truncate(metaDesc, 160)));
    html = injectPlaceholder(html, '{{CANONICAL}}', canonical);
    html = injectPlaceholder(html, '{{JSON_LD}}', placeholderVal(jobPosting));

    res.send(html);
  } catch (err) {
    console.error('Error renderizando /empleo/:id', err);
    res.status(500).send('Error interno del servidor');
  }
});

// 404 handler (todas las rutas no coincidentes, cualquier método)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada' });
  }
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

if (require.main === module) {
  store.init()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Chamba.com corriendo en http://localhost:${PORT} (storage: ${store.getMode()})`);
      });
    })
    .catch((e) => {
      console.error('FATAL: No se pudo inicializar el almacenamiento de datos:', e.message);
      process.exit(1);
    });
}

module.exports = app;
