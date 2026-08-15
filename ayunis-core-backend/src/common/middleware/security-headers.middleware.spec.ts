import { createServer } from 'node:http';
import type { Request, Response } from 'express';
import { createPinoLoggerMock } from '../testing/pino-logger.mock';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

describe('SecurityHeadersMiddleware', () => {
  it('allows browser telemetry to reach the AppSignal collector', async () => {
    const middleware = new SecurityHeadersMiddleware(createPinoLoggerMock());
    const server = createServer((request, response) => {
      middleware.use(
        request as unknown as Request,
        response as unknown as Response,
        () => response.end(),
      );
    });

    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Test server did not bind to a TCP port');
      }

      const response = await fetch(`http://127.0.0.1:${address.port}`);
      const policy = response.headers.get('content-security-policy');

      expect(policy).toContain(
        "connect-src 'self' https://appsignal-endpoint.net",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
