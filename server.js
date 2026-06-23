const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const DATA_FILE = path.join(__dirname, 'data', 'empleos.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const POSTULACIONES_FILE = path.join(__dirname, 'data', 'postulaciones.json');
const CONTACTO_FILE = path.join(__dirname, 'data', 'contacto.json');

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS restringido
app.use(cors({
  origin: ['https://chamba.com', 'http://localhost:3000'],
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
  max: 5,
  message: { error: 'Demasiadas solicitudes. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

// --- Helpers ---
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Error reading file:`, e.message);
    return [];
  }
}

function writeJSON(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

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

function generateId(items) {
  return items.length > 0 ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
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
app.get('/api/empleos', optionalAuth, (req, res) => {
  let empleos = readJSON(DATA_FILE);
  const { busqueda, categoria, departamentos, page = 1, limit = 10, solo_abiertos } = req.query;

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

app.get('/api/empleos/:id', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleos = readJSON(DATA_FILE);
  const empleo = empleos.find(e => e.id === id);
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });
  res.json(addExpirationStatus(empleo));
});

app.post('/api/empleos', authMiddleware, employerOnly, empleosWriteLimiter, (req, res) => {
  const { titulo, empresa, categoria, departamento, descripcion, fecha_limite } = req.body;

  if (!titulo || !empresa || !categoria || !departamento || !fecha_limite) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const empleos = readJSON(DATA_FILE);
  const nuevoEmpleo = {
    id: generateId(empleos),
    titulo: truncate(sanitize(titulo), 200),
    empresa: truncate(sanitize(empresa), 100),
    categoria: truncate(sanitize(categoria), 100),
    departamento: truncate(sanitize(departamento), 100),
    descripcion: truncate(sanitize(descripcion || ''), 2000),
    fecha_limite,
    empresa_id: req.user.id,
    createdAt: new Date().toISOString()
  };
  empleos.push(nuevoEmpleo);
  writeJSON(DATA_FILE, empleos);
  res.status(201).json(nuevoEmpleo);
});

app.put('/api/empleos/:id', authMiddleware, employerOnly, empleosWriteLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleos = readJSON(DATA_FILE);
  const index = empleos.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Empleo no encontrado' });

  if (empleos[index].empresa_id && empleos[index].empresa_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para editar este empleo' });
  }

  const allowed = ['titulo', 'empresa', 'categoria', 'departamento', 'descripcion', 'fecha_limite'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      const maxLen = key === 'descripcion' ? 2000 : key === 'titulo' ? 200 : 100;
      updates[key] = truncate(sanitize(req.body[key]), maxLen);
    }
  }

  empleos[index] = { ...empleos[index], ...updates };
  writeJSON(DATA_FILE, empleos);
  res.json(empleos[index]);
});

app.delete('/api/empleos/:id', authMiddleware, employerOnly, empleosWriteLimiter, (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  let empleos = readJSON(DATA_FILE);
  const empleo = empleos.find(e => e.id === id);
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });

  if (empleo.empresa_id && empleo.empresa_id !== req.user.id) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar este empleo' });
  }

  empleos = empleos.filter(e => e.id !== id);
  writeJSON(DATA_FILE, empleos);
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

  const users = readJSON(USERS_FILE);
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = {
    id: generateId(users),
    email,
    password: hashedPassword,
    nombre: truncate(sanitize(nombre), 100),
    tipo,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);

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

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.email === email);
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
app.post('/api/postulaciones', authMiddleware, postLimiter, (req, res) => {
  const { empleo_id, nombre, email, carta } = req.body;

  if (!empleo_id || !nombre || !email) {
    return res.status(400).json({ error: 'empleo_id, nombre y email son requeridos' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const postulaciones = readJSON(POSTULACIONES_FILE);
  const newPost = {
    id: generateId(postulaciones),
    empleo_id: parseInt(empleo_id),
    nombre: truncate(sanitize(nombre), 100),
    email,
    telefono: truncate(req.body.telefono || '', 20),
    carta: truncate(sanitize(carta || ''), 2000),
    aspirante_id: req.user.id,
    createdAt: new Date().toISOString()
  };
  postulaciones.push(newPost);
  writeJSON(POSTULACIONES_FILE, postulaciones);
  res.status(201).json(newPost);
});

app.get('/api/postulaciones', authMiddleware, employerOnly, (req, res) => {
  const postulaciones = readJSON(POSTULACIONES_FILE);
  const empleos = readJSON(DATA_FILE);
  const { empleo_id } = req.query;

  let myEmpleoIds = empleos
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
app.post('/api/contacto', postLimiter, (req, res) => {
  const { nombre, email, asunto, mensaje } = req.body;
  if (!nombre || !email || !asunto || !mensaje) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  const contactos = readJSON(CONTACTO_FILE);
  contactos.push({
    id: generateId(contactos),
    nombre: truncate(sanitize(nombre), 100),
    email,
    asunto: truncate(sanitize(asunto), 200),
    mensaje: truncate(sanitize(mensaje), 2000),
    createdAt: new Date().toISOString()
  });
  writeJSON(CONTACTO_FILE, contactos);
  res.status(201).json({ success: true });
});

// 404 handler
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Chamba.com corriendo en http://localhost:${PORT}`);
});
