import { createServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import devCerts from 'office-addin-dev-certs';

const PORT = Number(process.env.PORT ?? 3050);
const FRONTEND = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3031';
const BACKEND = process.env.BACKEND_ORIGIN ?? 'http://localhost:3030';

const ADDIN_ROOT = resolve(fileURLToPath(new URL('./addin', import.meta.url)));
const ADDIN_PREFIX = '/addin/';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
};

function targetFor(pathname) {
  return pathname.startsWith('/api/') ? BACKEND : FRONTEND;
}

function resolveAddinFile(pathname) {
  const relative = normalize(pathname.slice(ADDIN_PREFIX.length)).replace(
    /^(\.\.[/\\])+/,
    '',
  );
  const target = join(ADDIN_ROOT, relative);
  return target.startsWith(ADDIN_ROOT) ? target : null;
}

async function serveAddinFile(pathname, res) {
  const target = resolveAddinFile(pathname);
  if (!target) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const file = await readFile(target);
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(target)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

function proxy(req, res) {
  const origin = new URL(targetFor(new URL(req.url, 'https://localhost').pathname));
  const upstream = httpRequest(
    {
      hostname: origin.hostname,
      port: origin.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: origin.host },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Upstream not reachable: ${origin.origin}\n${error.message}`);
  });

  req.on('error', () => upstream.destroy());
  res.on('error', () => upstream.destroy());

  req.pipe(upstream);
}

const options =
  process.env.ADDIN_TLS_KEY && process.env.ADDIN_TLS_CERT
    ? {
        key: await readFile(process.env.ADDIN_TLS_KEY),
        cert: await readFile(process.env.ADDIN_TLS_CERT),
      }
    : await devCerts.getHttpsServerOptions();

const server = createServer(options, (req, res) => {
  const pathname = new URL(req.url ?? '/', 'https://localhost').pathname;
  if (pathname.startsWith(ADDIN_PREFIX)) {
    serveAddinFile(pathname, res).catch(() => {
      res.writeHead(500).end('Internal error');
    });
    return;
  }
  proxy(req, res);
});

server.on('clientError', (error, socket) => {
  socket.destroy();
});

// Vite's HMR websocket is intentionally NOT proxied: forwarding raw upgrade
// frames corrupts the mask bit and crashes the upstream Vite process. The
// task pane doesn't need hot reload — reject the upgrade cleanly instead.
server.on('upgrade', (req, socket) => {
  socket.destroy();
});

server.listen(PORT, () => {
  console.log(`Add-in origin:  https://localhost:${PORT}`);
  console.log(`Task pane:      https://localhost:${PORT}/chat?embedded=1`);
  console.log(`Proxying app →  ${FRONTEND}`);
  console.log(`Proxying api →  ${BACKEND}`);
});
