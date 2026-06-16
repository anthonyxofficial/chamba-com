const fs = require('fs');
const path = require('path');

const POSTULACIONES_FILE = path.join(__dirname, '..', '..', 'data', 'postulaciones.json');

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET /api/postulaciones
  if (event.httpMethod === 'GET') {
    const postulaciones = readJSON(POSTULACIONES_FILE);
    const url = new URL(event.path, 'http://localhost');
    const params = Object.fromEntries(url.searchParams);
    let filtered = postulaciones;
    if (params.empleo_id) filtered = postulaciones.filter(p => p.empleo_id === parseInt(params.empleo_id));
    return { statusCode: 200, headers, body: JSON.stringify(filtered) };
  }

  // POST /api/postulaciones
  if (event.httpMethod === 'POST') {
    const data = JSON.parse(event.body);
    const postulaciones = readJSON(POSTULACIONES_FILE);
    const newPost = {
      id: postulaciones.length > 0 ? Math.max(...postulaciones.map(p => p.id)) + 1 : 1,
      ...data,
      createdAt: new Date().toISOString()
    };
    postulaciones.push(newPost);
    writeJSON(POSTULACIONES_FILE, postulaciones);
    return { statusCode: 201, headers, body: JSON.stringify(newPost) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
};
