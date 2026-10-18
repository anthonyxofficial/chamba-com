// Carga variables de un archivo .env a process.env (solo si ya no están definidas).
// Sirve para desarrollo local; en producción (Render) las variables se definen en el dashboard.
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return true;
  } catch (e) {
    console.error('Error cargando .env:', e.message);
    return false;
  }
}

loadEnvFile(path.join(__dirname, '.env'));

module.exports = { loadEnvFile };
