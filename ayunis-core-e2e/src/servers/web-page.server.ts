import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface WebPageServer {
  url: string;
  close: () => Promise<void>;
}

/**
 * Serves one static HTML page on a random loopback port, so a knowledge-base
 * URL crawl finishes without reaching the internet. The backend runs on the
 * same host as the test runner locally and in CI.
 */
export async function startWebPageServer(
  title: string,
  body: string,
): Promise<WebPageServer> {
  const html = `<!doctype html><html lang="de"><head><title>${title}</title></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
