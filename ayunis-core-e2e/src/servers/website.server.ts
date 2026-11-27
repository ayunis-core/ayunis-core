import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface WebsitePage {
  contentType: string;
  body: string | Buffer;
  status?: number;
}

export interface WebsiteServer {
  /**
   * The page's URL on this server, e.g. `url('/rathaus')`. Loopback hosts are
   * private, so the backend fetches a PDF there only with a crawl-domain grant
   * for the host; grant `localhost`, never `127.0.0.1`, which other specs crawl.
   */
  url(path: string, host?: '127.0.0.1' | 'localhost'): string;
  /** Serves `page` at `path` from the next request on. */
  setPage(path: string, page: WebsitePage): void;
  close(): Promise<void>;
}

export function htmlPage(title: string, body: string): WebsitePage {
  return {
    contentType: 'text/html; charset=utf-8',
    body: `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`,
  };
}

/**
 * A loopback website the backend crawls; its pages can change between syncs.
 * Paths without a page answer 404.
 */
export async function startWebsiteServer(
  pages: Record<string, WebsitePage>,
): Promise<WebsiteServer> {
  const current = new Map(Object.entries(pages));
  const server = createServer((req, res) => {
    const page = current.get(new URL(req.url ?? '/', 'http://site').pathname);
    if (!page) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(page.status ?? 200, { 'content-type': page.contentType });
    res.end(req.method === 'HEAD' ? undefined : page.body);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  return {
    url: (path, host = '127.0.0.1') => `http://${host}:${port}${path}`,
    setPage: (path, page) => current.set(path, page),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      }),
  };
}
