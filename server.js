// Minimal static file server for the dist folder
// Usage: node server.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || Number(process.argv[2]) || 5175;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
};

function safeJoin(base, target) {
  const targetPath = path.normalize(decodeURI(target.split('?')[0].split('#')[0]));
  const fullPath = path.join(base, targetPath);
  if (!fullPath.startsWith(base)) {
    return null; // directory traversal attempt
  }
  return fullPath;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = safeJoin(distDir, urlPath);

  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    let finalPath = filePath;
    if (!err && stats.isDirectory()) {
      finalPath = path.join(filePath, 'index.html');
    }

    fs.readFile(finalPath, (readErr, data) => {
      if (readErr) {
        if (readErr.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Internal Server Error');
        }
        return;
      }

      const ext = path.extname(finalPath).toLowerCase();
      const type = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Serving ${distDir} at http://localhost:${port}`);
});
