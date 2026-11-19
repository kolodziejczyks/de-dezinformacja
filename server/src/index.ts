import { createServer } from 'node:http';
import { handleRequest } from './api.ts';
import { CertListCache } from './cert-cache.ts';

const port = Number(process.env['PORT'] ?? 3333);
const refreshMs = Number(process.env['CERT_REFRESH_MS'] ?? 30 * 60 * 1000);
const feedUrl = process.env['CERT_FEED_URL'] ?? 'https://hole.cert.pl/domains/v2/domains.txt';
const staticDir = process.env['STATIC_DIR'];

const cache = new CertListCache({
  feedUrl,
  refreshMs: Number.isFinite(refreshMs) && refreshMs > 0 ? refreshMs : 30 * 60 * 1000,
});
cache.start();

const server = createServer((req, res) => {
  void handleRequest(req, res, { cache, staticDir }).catch((error: unknown) => {
    console.error('API request failed', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'unavailable' }));
  });
});

server.listen(port, () => {
  console.log(`API listening on http://127.0.0.1:${port}`);
  if (staticDir) {
    console.log(`Serving files from ${staticDir}`);
  }
});

function shutdown(): void {
  cache.stop();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
