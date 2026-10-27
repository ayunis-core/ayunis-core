import { createServer, type Server } from 'node:http';
import { Agent } from 'undici';
import { fetchWithUndiciDispatcher } from './undici-fetch.util';

describe('fetchWithUndiciDispatcher', () => {
  let server: Server;
  let baseUrl: string;
  const dispatcher = new Agent();

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(400, {
        'content-type': 'application/json',
        'x-trace': 'kept',
      });
      response.write('{"error":');
      setTimeout(() => response.end('"invalid_grant"}'), 10);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await dispatcher.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns a global Response with status, headers and the streamed body', async () => {
    const response = await fetchWithUndiciDispatcher(`${baseUrl}/token`, {
      dispatcher,
    });

    expect(response).toBeInstanceOf(globalThis.Response);
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('x-trace')).toBe('kept');
    await expect(response.text()).resolves.toBe('{"error":"invalid_grant"}');
  });
});
