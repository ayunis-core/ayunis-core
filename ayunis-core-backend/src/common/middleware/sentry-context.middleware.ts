import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/nestjs';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apikey', 'api_key'];

/**
 * Enriches the current Sentry scope with request context so that any
 * exception captured during this request carries full context.
 *
 * Only sets data available in the middleware phase (path, method, body,
 * params, query). User context (userId/orgId/role) is set later by
 * UserContextInterceptor, which runs after authentication.
 */
@Injectable()
export class SentryContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    Sentry.getCurrentScope().setTag('path', req.path);
    Sentry.getCurrentScope().setTag('method', req.method);

    Sentry.getCurrentScope().setExtra('requestBody', sanitizeBody(req.body));
    Sentry.getCurrentScope().setExtra('requestParams', req.params);
    Sentry.getCurrentScope().setExtra('requestQuery', req.query);

    next();
  }
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body } as Record<string, unknown>;

  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
