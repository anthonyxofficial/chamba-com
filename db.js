// db.js — capa única de almacenamiento para CHAMBA.
// Con MONGODB_URI: MongoDB Atlas (colecciones users/empleos/postulaciones/contacto + counters para IDs numéricos).
// Sin MONGODB_URI: fallback a los archivos data/*.json de siempre (desarrollo local y tests).
const path = require('path');
const fs = require('fs');
const { MongoClient } = require('mongodb');

require('./env'); // carga .env en desarrollo (no sobreescribe variables ya definidas)

const MONGODB_URI = process.env.MONGODB_URI || '';
const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
  empleos: path.join(DATA_DIR, 'empleos.json'),
  users: path.join(DATA_DIR, 'users.json'),
  postulaciones: path.join(DATA_DIR, 'postulaciones.json'),
  contacto: path.join(DATA_DIR, 'contacto.json')
};
const COLLECTIONS = ['empleos', 'users', 'postulaciones', 'contacto'];

let client = null;
let database = null;
let mode = 'json';

// --- Helpers JSON (idénticos al comportamiento original del servidor) ---
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

function stripId(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}

function maxIdOf(arr) {
  return arr.reduce((m, d) => Math.max(m, d.id || 0), 0);
}

// --- Init ---
async function init() {
  if (!MONGODB_URI) {
    mode = 'json';
    console.log('Store: usando archivos JSON (sin MONGODB_URI, modo desarrollo/tests).');
    return;
  }

  client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  database = client.db(); // usa la base indicada en el URI (/chamba)
  mode = 'mongo';

  const counters = database.collection('counters');

  for (const name of COLLECTIONS) {
    const col = database.collection(name);
    if ((await col.countDocuments()) === 0) {
      const seed = readJSON(FILES[name]);
      if (seed.length > 0) {
        await col.insertMany(seed.map(stripId)); // dentro de Mongo no guardamos _id
      }
    }
    // Garantiza que el contador quede por encima del id más alto existente
    const maxId = maxIdOf(await col.find({}, { projection: { id: 1 } }).toArray());
    await counters.updateOne({ name }, { $setOnInsert: { seq: maxId } }, { upsert: true });
  }

  // Un único email por cuenta, a nivel de base de datos
  await database.collection('users').createIndex({ email: 1 }, { unique: true });

  console.log('Store: conectado a MongoDB.');
}

// --- Operaciones ---
async function getAll(name) {
  if (mode === 'mongo') {
    return (await database.collection(name).find({}).toArray()).map(stripId);
  }
  return readJSON(FILES[name]);
}

async function nextId(name) {
  if (mode === 'mongo') {
    const res = await database.collection('counters').findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' }
    );
    return res.seq;
  }
  return maxIdOf(readJSON(FILES[name])) + 1;
}

async function insert(name, doc) {
  if (mode === 'mongo') {
    await database.collection(name).insertOne({ ...doc });
    return doc;
  }
  const items = readJSON(FILES[name]);
  items.push(doc);
  writeJSON(FILES[name], items);
  return doc;
}

async function update(name, id, updates) {
  if (mode === 'mongo') {
    const res = await database.collection(name).findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return stripId(res.value || res);
  }
  const items = readJSON(FILES[name]);
  const i = items.findIndex(e => e.id === id);
  if (i === -1) return null;
  items[i] = { ...items[i], ...updates };
  writeJSON(FILES[name], items);
  return items[i];
}

async function remove(name, id) {
  if (mode === 'mongo') {
    const res = await database.collection(name).deleteOne({ id });
    return res.deletedCount > 0;
  }
  const items = readJSON(FILES[name]);
  const i = items.findIndex(e => e.id === id);
  if (i === -1) return false;
  items.splice(i, 1);
  writeJSON(FILES[name], items);
  return true;
}

// --- Utilidades ---
function getMode() {
  return mode;
}

async function close() {
  if (client) await client.close();
}

module.exports = { init, getAll, nextId, insert, update, remove, getMode, close };
