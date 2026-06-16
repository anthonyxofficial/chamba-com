const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'empleos.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const POSTULACIONES_FILE = path.join(__dirname, 'data', 'postulaciones.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Función para verificar si un empleo está expirado
function isExpired(fechaLimite) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaLimite);
  fecha.setHours(0, 0, 0, 0);
  return fecha < hoy;
}

// Función para agregar estado de expiración a empleos
function addExpirationStatus(empleo) {
  return {
    ...empleo,
    expirado: isExpired(empleo.fecha_limite),
    estado: isExpired(empleo.fecha_limite) ? 'Cerrado' : 'Abierto'
  };
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
  const start = (page - 1) * limit;
  const paginated = empleos.slice(start, start + parseInt(limit)).map(addExpirationStatus);

  res.json({
    empleos: paginated,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  });
});

app.get('/api/empleos/:id', (req, res) => {
  const empleos = readJSON(DATA_FILE);
  const empleo = empleos.find(e => e.id === parseInt(req.params.id));
  if (!empleo) return res.status(404).json({ error: 'Empleo no encontrado' });
  res.json(addExpirationStatus(empleo));
});

app.post('/api/empleos', (req, res) => {
  const empleos = readJSON(DATA_FILE);
  const newId = empleos.length > 0 ? Math.max(...empleos.map(e => e.id)) + 1 : 1;
  const nuevoEmpleo = { id: newId, ...req.body, createdAt: new Date().toISOString() };
  empleos.push(nuevoEmpleo);
  writeJSON(DATA_FILE, empleos);
  res.status(201).json(nuevoEmpleo);
});

app.put('/api/empleos/:id', (req, res) => {
  const empleos = readJSON(DATA_FILE);
  const index = empleos.findIndex(e => e.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Empleo no encontrado' });
  empleos[index] = { ...empleos[index], ...req.body };
  writeJSON(DATA_FILE, empleos);
  res.json(empleos[index]);
});

app.delete('/api/empleos/:id', (req, res) => {
  let empleos = readJSON(DATA_FILE);
  empleos = empleos.filter(e => e.id !== parseInt(req.params.id));
  writeJSON(DATA_FILE, empleos);
  res.json({ success: true });
});

// Usuarios
app.post('/api/auth/register', (req, res) => {
  const users = readJSON(USERS_FILE);
  const { email, password, nombre, tipo } = req.body;

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'El email ya está registrado' });
  }

  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    email,
    password,
    nombre,
    tipo,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.status(201).json({ id: newUser.id, email, nombre, tipo });
});

app.post('/api/auth/login', (req, res) => {
  const users = readJSON(USERS_FILE);
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  res.json({ id: user.id, email: user.email, nombre: user.nombre, tipo: user.tipo });
});

// Postulaciones
app.post('/api/postulaciones', (req, res) => {
  const postulaciones = readJSON(POSTULACIONES_FILE);
  const newPost = {
    id: postulaciones.length > 0 ? Math.max(...postulaciones.map(p => p.id)) + 1 : 1,
    ...req.body,
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
