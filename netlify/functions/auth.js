const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', '..', 'data', 'users.json');

function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const data = JSON.parse(event.body);

  // POST /api/auth/register
  if (event.path === '/api/auth/register') {
    const users = readJSON(USERS_FILE);
    const { email, password, nombre, tipo } = data;

    if (users.find(u => u.email === email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'El email ya está registrado' }) };
    }

    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      email, password, nombre, tipo,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return { statusCode: 201, headers, body: JSON.stringify({ id: newUser.id, email, nombre, tipo }) };
  }

  // POST /api/auth/login
  if (event.path === '/api/auth/login') {
    const users = readJSON(USERS_FILE);
    const { email, password } = data;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Credenciales inválidas' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ id: user.id, email: user.email, nombre: user.nombre, tipo: user.tipo }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
};
