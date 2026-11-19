import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import type { ServerResponse } from 'node:http';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

/** Resolved file inside `root`, or null when the path escapes the folder. */
export function safePath(root: string, pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) {
    return null;
  }
  const relative = decoded.replace(/^[/\\]+/, '');
  const rootNorm = normalize(root);
  const full = normalize(join(rootNorm, relative));
  if (full !== rootNorm && !full.startsWith(rootNorm + sep)) {
    return null;
  }
  return full;
}

/**
 * Serves a file from `root`. Unknown extension-less paths fall back to
 * `index.html` so the Angular app can refresh on its route.
 * Returns false when nothing was written and the caller should send 404.
 */
export function serveStatic(root: string, pathname: string, res: ServerResponse): boolean {
  const full = safePath(root, pathname);
  if (!full) {
    sendText(res, 400, 'Bad path');
    return true;
  }

  let target = full;
  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, 'index.html');
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    if (extname(pathname)) {
      return false;
    }
    const fallback = join(normalize(root), 'index.html');
    if (!existsSync(fallback)) {
      return false;
    }
    target = fallback;
  }

  const extension = extname(target).toLowerCase();
  const cache =
    extension === '.html' || extension === '.webmanifest' ? 'no-cache' : 'public, max-age=86400';
  res.writeHead(200, {
    'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    'cache-control': cache,
  });
  createReadStream(target).pipe(res);
  return true;
}

function sendText(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
}
