import { createServer } from 'node:http';
import type { Request, Response } from 'express';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

async function contentSecurityPolicy(): Promise<string | null> {
  const middleware = new SecurityHeadersMiddleware(createPinoLoggerMock());
  const server = createServer((request, response) => {
    middleware.use(
      request as unknown as Request,
      response as unknown as Response,
      () => response.end(),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not bind to a TCP port');
    }
    const response = await fetch(`http://127.0.0.1:${address.port}`);
    return response.headers.get('content-security-policy');
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe('SecurityHeadersMiddleware', () => {
  const originalTileUrl = process.env.VITE_MAP_BASEMAP_TILE_URL;

  afterEach(() => {
    if (originalTileUrl === undefined) {
      delete process.env.VITE_MAP_BASEMAP_TILE_URL;
    } else {
      process.env.VITE_MAP_BASEMAP_TILE_URL = originalTileUrl;
    }
  });

  it('allows browser telemetry to reach the AppSignal collector', async () => {
    const policy = await contentSecurityPolicy();

    expect(policy).toContain('https://appsignal-endpoint.net');
  });

  it('allows the default basemap origin for map tile requests', async () => {
    delete process.env.VITE_MAP_BASEMAP_TILE_URL;

    const policy = await contentSecurityPolicy();

    expect(policy).toContain(
      "img-src 'self' data: blob: https://tile.openstreetmap.org",
    );
    expect(policy).toContain(
      "connect-src 'self' https://appsignal-endpoint.net https://tile.openstreetmap.org",
    );
  });

  it('allows the configured basemap origin for map tile requests', async () => {
    process.env.VITE_MAP_BASEMAP_TILE_URL =
      'https://maps.example.org/tiles/{z}/{x}/{y}.png';

    const policy = await contentSecurityPolicy();

    expect(policy).toContain('https://maps.example.org');
    expect(policy).not.toContain('https://tile.openstreetmap.org');
  });
});
