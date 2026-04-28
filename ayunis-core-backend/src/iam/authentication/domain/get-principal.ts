import type { Request } from 'express';
import type { ActivePrincipal } from './active-principal.entity';

/**
 * Reads the authenticated principal off a request.
 *
 * Both Passport strategies (JWT and API-key) populate `request.user` with an
 * `ActivePrincipal` — this helper centralises the cast so callers get a typed
 * union (`ActiveUser | ActiveApiKey`) without spreading `as`-casts across
 * guards, interceptors, and controllers.
 */
export function getPrincipal(request: Request): ActivePrincipal | undefined {
  return request.user as ActivePrincipal | undefined;
}
