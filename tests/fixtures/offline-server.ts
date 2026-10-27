import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
export async function offlineServer() {
  const root = resolve('dist'),
    state = { revision: '', failAsset: false };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, 'http://localhost');
      if (!url.pathname.startsWith('/neural-atlas/')) {
        res.writeHead(404).end();
        return;
      }
      if (state.failAsset && url.pathname.endsWith('/icon-192.png')) {
        res.writeHead(503).end('interrupted');
        return;
      }
      const relative =
          decodeURIComponent(url.pathname.slice('/neural-atlas/'.length)) || 'index.html',
        path = resolve(root, relative);
      if (!path.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      let bytes = await readFile(path);
      if (relative === 'sw.js' && state.revision) {
        const text = bytes.toString();
        const end = text.indexOf(';\n');
        const config = JSON.parse(text.slice('const CONFIG = '.length, end)) as {
          version: string;
          cacheName: string;
        };
        config.version += '-' + state.revision;
        config.cacheName += '-' + state.revision;
        bytes = Buffer.from('const CONFIG = ' + JSON.stringify(config) + text.slice(end));
      }
      const ext = relative.split('.').at(-1),
        mime =
          ext === 'js'
            ? 'text/javascript'
            : ext === 'html'
              ? 'text/html'
              : ext === 'css'
                ? 'text/css'
                : ext === 'json' || ext === 'webmanifest'
                  ? 'application/json'
                  : ext === 'svg'
                    ? 'image/svg+xml'
                    : ext === 'png'
                      ? 'image/png'
                      : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }).end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('SERVER');
  return {
    state,
    url: `http://127.0.0.1:${address.port}/neural-atlas/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((e) => (e ? reject(e) : resolve()));
      }),
  };
}
