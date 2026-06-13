'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const { generateUsers } = require('./src/data');
const { buildCompatibilityGraph, formQuads } = require('./src/match');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function clampUsers(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 60;
  return Math.min(200, Math.max(10, parsed));
}

function simulate(userCount) {
  const users = generateUsers(userCount);
  const { graph, edgeMap } = buildCompatibilityGraph(users);
  const quads = formQuads(users, graph, edgeMap);
  const edgeCount = edgeMap.size;
  const totalPairs = (users.length * (users.length - 1)) / 2;

  return {
    stats: {
      userCount: users.length,
      totalPairs,
      compatiblePairs: edgeCount,
      compatiblePct: edgeCount / totalPairs,
      avgDegree: +((edgeCount * 2) / users.length).toFixed(1),
      quadsFormed: quads.length,
      matched: quads.length * 4,
      unmatched: users.length - quads.length * 4,
    },
    quads,
  };
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': MIME['.json'],
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store',
  });
  res.end(json);
}

function safePublicPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const requested = decoded === '/' ? '/index.html' : decoded;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  return filePath === PUBLIC_DIR || filePath.startsWith(`${PUBLIC_DIR}${path.sep}`) ? filePath : null;
}

function serveStatic(req, res, pathname) {
  const filePath = safePublicPath(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    res.end(data);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/simulate') {
      sendJson(res, 200, simulate(clampUsers(url.searchParams.get('users'))));
      return;
    }

    if (url.pathname === '/mobile' || url.pathname === '/mobile/' ||
        url.pathname === '/desktop' || url.pathname === '/desktop/') {
      serveStatic(req, res, '/index.html');
      return;
    }

    serveStatic(req, res, url.pathname);
  });
}

function start(port = PORT, maxAttempts = 10) {
  const server = createServer();
  server.on('error', err => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
      start(port + 1, maxAttempts - 1);
      return;
    }
    throw err;
  });
  server.listen(port, HOST, () => {
    console.log(`QUAD -> http://${HOST}:${port}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { createServer, simulate, clampUsers, start };
