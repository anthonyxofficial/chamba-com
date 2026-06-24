const http = require('http');
const app = require('../server');

let server;
let BASE_URL;

function start(port = 0) {
  return new Promise((resolve) => {
    server = app.listen(port, () => {
      const addr = server.address();
      BASE_URL = `http://localhost:${addr.port}`;
      resolve(BASE_URL);
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

function request(method, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: 'localhost',
      port: server.address().port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { start, stop, request, authHeaders };
