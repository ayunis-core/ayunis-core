import { MetricsAuthMiddleware } from './metrics-auth.middleware';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';

function createConfigService(
  user: string | undefined,
  password: string | undefined,
): ConfigService {
  return {
    get: jest.fn().mockReturnValue({ user, password }),
  } as unknown as ConfigService;
}

function createMockResponse(): Response {
  const res = {
    setHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function basicAuth(user: string, password: string): string {
  return 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64');
}

describe('MetricsAuthMiddleware', () => {
  let next: NextFunction;
  let res: Response;

  beforeEach(() => {
    next = jest.fn();
    res = createMockResponse();
  });

  describe('when credentials are not configured', () => {
    it('should pass through without authentication', () => {
      const middleware = new MetricsAuthMiddleware(
        createConfigService(undefined, undefined),
      );

      middleware.use({ headers: {} } as Request, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('when only user is configured', () => {
    it('should reject all requests with 401', () => {
      const middleware = new MetricsAuthMiddleware(
        createConfigService('admin', undefined),
      );

      const req = {
        headers: { authorization: basicAuth('admin', 'anything') },
      } as unknown as Request;

      middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('when only password is configured', () => {
    it('should reject all requests with 401', () => {
      const middleware = new MetricsAuthMiddleware(
        createConfigService(undefined, 'secret'),
      );

      const req = {
        headers: { authorization: basicAuth('anyone', 'secret') },
      } as unknown as Request;

      middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('when both credentials are configured', () => {
    let middleware: MetricsAuthMiddleware;

    beforeEach(() => {
      middleware = new MetricsAuthMiddleware(
        createConfigService('prometheus', 's3cret!'),
      );
    });

    it('should reject requests without authorization header', () => {
      middleware.use({ headers: {} } as Request, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'WWW-Authenticate',
        'Basic realm="Metrics"',
      );
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject requests with non-Basic auth scheme', () => {
      const req = {
        headers: { authorization: 'Bearer some-token' },
      } as unknown as Request;

      middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject requests with wrong username', () => {
      const req = {
        headers: { authorization: basicAuth('wrong-user', 's3cret!') },
      } as unknown as Request;

      middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject requests with wrong password', () => {
      const req = {
        headers: { authorization: basicAuth('prometheus', 'wrong-pass') },
      } as unknown as Request;

      middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow requests with correct credentials', () => {
      const req = {
        headers: { authorization: basicAuth('prometheus', 's3cret!') },
      } as unknown as Request;

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle passwords containing colons', () => {
      const mw = new MetricsAuthMiddleware(
        createConfigService('prometheus', 'pass:with:colons'),
      );

      const req = {
        headers: {
          authorization: basicAuth('prometheus', 'pass:with:colons'),
        },
      } as unknown as Request;

      mw.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
