const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'empleos.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const POSTULACIONES_FILE = path.join(__dirname, 'data', 'postulaciones.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isExpired(fechaLimite) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaLimite);
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
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

// Empleos
app.get('/api/empleos', (req, res) => {
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
      e.descripcion.toLowerCase().includes(term)
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

app.get('/api/empleos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleos = readJSON(DATA_FILE);
  const empleo = empleos.find(e => e.id === id);
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });
  res.json(addExpirationStatus(empleo));
});

app.post('/api/empleos', (req, res) => {
  const { titulo, empresa, categoria, departamento, descripcion, fecha_limite } = req.body;

  if (!titulo || !empresa || !categoria || !departamento || !fecha_limite) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const empleos = readJSON(DATA_FILE);
  const newId = empleos.length > 0 ? Math.max(...empleos.map(e => e.id)) + 1 : 1;
  const nuevoEmpleo = {
    id: newId,
    titulo: sanitize(titulo),
    empresa: sanitize(empresa),
    categoria: sanitize(categoria),
    departamento: sanitize(departamento),
    descripcion: sanitize(descripcion || ''),
    fecha_limite,
    createdAt: new Date().toISOString()
  };
  empleos.push(nuevoEmpleo);
  writeJSON(DATA_FILE, empleos);
  res.status(201).json(nuevoEmpleo);
});

app.put('/api/empleos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const empleos = readJSON(DATA_FILE);
  const index = empleos.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Empleo no encontrado' });

  const allowed = ['titulo', 'empresa', 'categoria', 'departamento', 'descripcion', 'fecha_limite'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = sanitize(req.body[key]);
    }
  }

  empleos[index] = { ...empleos[index], ...updates };
  writeJSON(DATA_FILE, empleos);
  res.json(empleos[index]);
});

app.delete('/api/empleos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  let empleos = readJSON(DATA_FILE);
  const found = empleos.some(e => e.id === id);
  empleos = empleos.filter(e => e.id !== id);
  writeJSON(DATA_FILE, empleos);
  res.json({ success: true, deleted: found });
});

// Usuarios
app.post('/api/auth/register', async (req, res) => {
  const { email, password, nombre, tipo } = req.body;

  if (!email || !password || !nombre || !tipo) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  if (!['aspirante', 'empresa'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de cuenta inválido' });
  }

  const users = readJSON(USERS_FILE);
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    email,
    password: hashedPassword,
    nombre: sanitize(nombre),
    tipo,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.status(201).json({ id: newUser.id, email, nombre, tipo });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

  res.json({ id: user.id, email: user.email, nombre: user.nombre, tipo: user.tipo });
});

// Postulaciones
app.post('/api/postulaciones', (req, res) => {
  const { empleo_id, nombre, email, carta } = req.body;

  if (!empleo_id || !nombre || !email) {
    return res.status(400).json({ error: 'empleo_id, nombre y email son requeridos' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const postulaciones = readJSON(POSTULACIONES_FILE);
  const newPost = {
    id: postulaciones.length > 0 ? Math.max(...postulaciones.map(p => p.id)) + 1 : 1,
    empleo_id: parseInt(empleo_id),
    nombre: sanitize(nombre),
    email,
    telefono: req.body.telefono || '',
    carta: sanitize(carta || ''),
    createdAt: new Date().toISOString()
  };
  postulaciones.push(newPost);
  writeJSON(POSTULACIONES_FILE, postulaciones);
  res.status(201).json(newPost);
});

app.get('/api/postulaciones', (req, res) => {
  const postulaciones = readJSON(POSTULACIONES_FILE);
  const { empleo_id } = req.query;
  let filtered = postulaciones;
  if (empleo_id) filtered = postulaciones.filter(p => p.empleo_id === parseInt(empleo_id));
  res.json(filtered);
});

// 404 handler
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Chamba.com corriendo en http://localhost:${PORT}`);
});
