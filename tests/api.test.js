const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { start, stop, request, authHeaders } = require('./setup');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(__dirname, '.backup');

const EMPLEOS_FILE = path.join(DATA_DIR, 'empleos.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTULACIONES_FILE = path.join(DATA_DIR, 'postulaciones.json');
const CONTACTO_FILE = path.join(DATA_DIR, 'contacto.json');

let empresaToken;
let aspiranteToken;
let empleoId;

function backupData() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
  for (const f of [EMPLEOS_FILE, USERS_FILE, POSTULACIONES_FILE, CONTACTO_FILE]) {
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(BACKUP_DIR, path.basename(f)));
  }
}

function restoreData() {
  for (const f of ['empleos.json', 'users.json', 'postulaciones.json', 'contacto.json']) {
    const src = path.join(BACKUP_DIR, f);
    const dst = path.join(DATA_DIR, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
    else if (fs.existsSync(dst)) fs.unlinkSync(dst);
  }
  if (fs.existsSync(BACKUP_DIR)) fs.rmSync(BACKUP_DIR, { recursive: true });
}

before(async () => {
  backupData();
  fs.writeFileSync(EMPLEOS_FILE, '[]', 'utf8');
  fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  fs.writeFileSync(POSTULACIONES_FILE, '[]', 'utf8');
  fs.writeFileSync(CONTACTO_FILE, '[]', 'utf8');
  await start();
});

after(async () => {
  await stop();
  restoreData();
});

describe('Health Check', () => {
  it('GET /api/health returns status ok', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(typeof res.body.uptime === 'number');
    assert.ok(res.body.timestamp);
    assert.ok(res.body.counts);
  });
});

describe('Auth', () => {
  const empresa = {
    email: 'test-empresa@chamba.hn',
    password: 'Test1234',
    nombre: 'Empresa Test',
    tipo: 'empresa'
  };

  const aspirante = {
    email: 'test-user@chamba.hn',
    password: 'Test1234',
    nombre: 'Juan Test',
    tipo: 'aspirante'
  };

  it('POST /api/auth/register - empresa', async () => {
    const res = await request('POST', '/api/auth/register', { body: empresa });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.tipo, 'empresa');
    empresaToken = res.body.token;
  });

  it('POST /api/auth/register - aspirante', async () => {
    const res = await request('POST', '/api/auth/register', { body: aspirante });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    aspiranteToken = res.body.token;
  });

  it('POST /api/auth/register - duplicate email fails', async () => {
    const res = await request('POST', '/api/auth/register', { body: empresa });
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/auth/register - weak password fails', async () => {
    const res = await request('POST', '/api/auth/register', {
      body: { ...empresa, email: 'weak@chamba.hn', password: '123' }
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/auth/login - success', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { email: empresa.email, password: empresa.password }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });

  it('POST /api/auth/login - wrong password fails', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { email: empresa.email, password: 'Wrong123' }
    });
    assert.equal(res.status, 401);
  });

  it('POST /api/auth/login - missing fields fails', async () => {
    const res = await request('POST', '/api/auth/login', { body: {} });
    assert.equal(res.status, 400);
  });
});

describe('Empleos CRUD', () => {
  const nuevoEmpleo = {
    titulo: 'Desarrollador Full Stack',
    empresa: 'Tech Honduras',
    categoria: 'Tecnología',
    departamento: 'Francisco Morazán',
    descripcion: 'Buscamos desarrollador con experiencia en Node.js',
    fecha_limite: '2026-12-31'
  };

  it('POST /api/empleos - crear empleo', async () => {
    const res = await request('POST', '/api/empleos', {
      body: nuevoEmpleo,
      headers: authHeaders(empresaToken)
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.titulo, nuevoEmpleo.titulo);
    assert.equal(res.body.empresa_id, 1);
    empleoId = res.body.id;
  });

  it('POST /api/empleos - sin auth falla', async () => {
    const res = await request('POST', '/api/empleos', { body: nuevoEmpleo });
    assert.equal(res.status, 401);
  });

  it('POST /api/empleos - aspirante no puede crear', async () => {
    const res = await request('POST', '/api/empleos', {
      body: nuevoEmpleo,
      headers: authHeaders(aspiranteToken)
    });
    assert.equal(res.status, 403);
  });

  it('POST /api/empleos - campos requeridos', async () => {
    const res = await request('POST', '/api/empleos', {
      body: { titulo: 'Solo titulo' },
      headers: authHeaders(empresaToken)
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/empleos - listar empleos', async () => {
    const res = await request('GET', '/api/empleos');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.empleos));
    assert.ok(res.body.total >= 1);
  });

  it('GET /api/empleos - buscar por término', async () => {
    const res = await request('GET', '/api/empleos?busqueda=Full+Stack');
    assert.equal(res.status, 200);
    assert.ok(res.body.empleos.length >= 1);
  });

  it('GET /api/empleos - filtrar por categoría', async () => {
    const res = await request('GET', '/api/empleos?categoria=Tecnología');
    assert.equal(res.status, 200);
    assert.ok(res.body.empleos.length >= 1);
  });

  it('GET /api/empleos/:id - ver empleo', async () => {
    const res = await request('GET', `/api/empleos/${empleoId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, empleoId);
  });

  it('GET /api/empleos/:id - ID inválido', async () => {
    const res = await request('GET', '/api/empleos/abc');
    assert.equal(res.status, 400);
  });

  it('GET /api/empleos/:id - no existe', async () => {
    const res = await request('GET', '/api/empleos/9999');
    assert.equal(res.status, 404);
  });

  it('PUT /api/empleos/:id - editar propio empleo', async () => {
    const res = await request('PUT', `/api/empleos/${empleoId}`, {
      body: { titulo: 'Desarrollador Senior Full Stack' },
      headers: authHeaders(empresaToken)
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.titulo, 'Desarrollador Senior Full Stack');
  });

  it('PUT /api/empleos/:id - aspirante no puede editar', async () => {
    const res = await request('PUT', `/api/empleos/${empleoId}`, {
      body: { titulo: 'Hack' },
      headers: authHeaders(aspiranteToken)
    });
    assert.equal(res.status, 403);
  });

  it('DELETE /api/empleos/:id - no existe', async () => {
    const res = await request('DELETE', '/api/empleos/9999', {
      headers: authHeaders(empresaToken)
    });
    assert.equal(res.status, 404);
  });
});

describe('Postulaciones', () => {
  let postulacionEmpleoId;

  before(async () => {
    const res = await request('POST', '/api/empleos', {
      body: {
        titulo: 'Diseñador UX',
        empresa: 'Design Co',
        categoria: 'Diseño',
        departamento: 'Cortés',
        fecha_limite: '2026-12-31'
      },
      headers: authHeaders(empresaToken)
    });
    postulacionEmpleoId = res.body.id;
  });

  it('POST /api/postulaciones - postularse', async () => {
    const res = await request('POST', '/api/postulaciones', {
      body: {
        empleo_id: postulacionEmpleoId,
        nombre: 'María López',
        email: 'maria@test.hn',
        carta: 'Tengo experiencia en diseño UX'
      },
      headers: authHeaders(aspiranteToken)
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.id);
  });

  it('POST /api/postulaciones - sin auth falla', async () => {
    const res = await request('POST', '/api/postulaciones', {
      body: { empleo_id: postulacionEmpleoId, nombre: 'X', email: 'x@x.com' }
    });
    assert.equal(res.status, 401);
  });

  it('POST /api/postulaciones - email inválido', async () => {
    const res = await request('POST', '/api/postulaciones', {
      body: { empleo_id: postulacionEmpleoId, nombre: 'X', email: 'no-email' },
      headers: authHeaders(aspiranteToken)
    });
    assert.equal(res.status, 400);
  });

  it('GET /api/postulaciones - empresa ve postulaciones de sus empleos', async () => {
    const res = await request('GET', '/api/postulaciones', {
      headers: authHeaders(empresaToken)
    });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  it('GET /api/postulaciones - filtrar por empleo_id', async () => {
    const res = await request('GET', `/api/postulaciones?empleo_id=${postulacionEmpleoId}`, {
      headers: authHeaders(empresaToken)
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 1);
  });

  it('GET /api/postulaciones - aspirante no puede ver', async () => {
    const res = await request('GET', '/api/postulaciones', {
      headers: authHeaders(aspiranteToken)
    });
    assert.equal(res.status, 403);
  });
});

describe('Contacto', () => {
  it('POST /api/contacto - enviar mensaje', async () => {
    const res = await request('POST', '/api/contacto', {
      body: {
        nombre: 'Pedro Martínez',
        email: 'pedro@test.hn',
        asunto: 'Consulta',
        mensaje: 'Quiero saber más sobre publicar empleos'
      }
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
  });

  it('POST /api/contacto - campos requeridos', async () => {
    const res = await request('POST', '/api/contacto', {
      body: { nombre: 'Solo nombre' }
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/contacto - email inválido', async () => {
    const res = await request('POST', '/api/contacto', {
      body: { nombre: 'X', email: 'bad', asunto: 'A', mensaje: 'B' }
    });
    assert.equal(res.status, 400);
  });
});

describe('Static files & 404', () => {
  it('GET / returns HTML', async () => {
    const res = await request('GET', '/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
  });

  it('GET /login.html returns HTML', async () => {
    const res = await request('GET', '/login.html');
    assert.equal(res.status, 200);
  });

  it('GET /no-existe returns 404 page', async () => {
    const res = await request('GET', '/no-existe');
    assert.equal(res.status, 404);
  });
});
