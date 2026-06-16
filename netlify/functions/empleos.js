const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'empleos.json');

function readJSON() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeJSON(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const url = new URL(event.path, 'http://localhost');
  const params = Object.fromEntries(url.searchParams);

  // GET /api/empleos
  if (event.httpMethod === 'GET' && !event.path.match(/\/api\/empleos\/\d+/)) {
    let empleos = readJSON();
    const { busqueda, categoria, departamentos, page = 1, limit = 10, solo_abiertos } = params;

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        empleos: paginated,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      })
    };
  }

  // GET /api/empleos/:id
  if (event.httpMethod === 'GET' && event.path.match(/\/api\/empleos\/\d+/)) {
    const id = parseInt(event.path.split('/').pop());
    const empleos = readJSON();
    const empleo = empleos.find(e => e.id === id);
    if (!empleo) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No encontrado' }) };
    return { statusCode: 200, headers, body: JSON.stringify(addExpirationStatus(empleo)) };
  }

  // POST /api/empleos
  if (event.httpMethod === 'POST') {
    const data = JSON.parse(event.body);
    const empleos = readJSON();
    const newId = empleos.length > 0 ? Math.max(...empleos.map(e => e.id)) + 1 : 1;
    const nuevo = { id: newId, ...data, createdAt: new Date().toISOString() };
    empleos.push(nuevo);
    writeJSON(empleos);
    return { statusCode: 201, headers, body: JSON.stringify(nuevo) };
  }

  // PUT /api/empleos/:id
  if (event.httpMethod === 'PUT') {
    const id = parseInt(event.path.split('/').pop());
    const data = JSON.parse(event.body);
    const empleos = readJSON();
    const index = empleos.findIndex(e => e.id === id);
    if (index === -1) return { statusCode: 404, headers, body: JSON.stringify({ error: 'No encontrado' }) };
    empleos[index] = { ...empleos[index], ...data };
    writeJSON(empleos);
    return { statusCode: 200, headers, body: JSON.stringify(empleos[index]) };
  }

  // DELETE /api/empleos/:id
  if (event.httpMethod === 'DELETE') {
    const id = parseInt(event.path.split('/').pop());
    let empleos = readJSON();
    empleos = empleos.filter(e => e.id !== id);
    writeJSON(empleos);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
};
