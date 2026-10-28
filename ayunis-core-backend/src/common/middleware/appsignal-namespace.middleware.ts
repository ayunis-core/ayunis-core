import { Injectable, NestMiddleware } from '@nestjs/common';
import { setNamespace } from '@appsignal/nodejs';
import { Request, Response, NextFunction } from 'express';

// Unmapped HTTP traffic stays in AppSignal's default `web` namespace, and
// BullMQ workers already report as `background` via their CONSUMER spans.
const NAMESPACES: ReadonlyArray<[RegExp, string]> = [
  [/^\/api\/super-admin(\/|\?|$)/, 'admin'],
  [/^\/api\/openai-compat(\/|\?|$)/, 'api'],
];

export function appsignalNamespaceFor(url: string): string | undefined {
  return NAMESPACES.find(([pattern]) => pattern.test(url))?.[1];
}

/**
 * Runs as middleware rather than an interceptor so requests rejected by a
 * guard (401/403) are still grouped under their namespace.
 */
@Injectable()
export class AppsignalNamespaceMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const namespace = appsignalNamespaceFor(req.originalUrl);
    if (namespace) {
      setNamespace(namespace);
    }
    next();
  }
}
