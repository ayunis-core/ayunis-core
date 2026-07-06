import type { Request } from 'express';
import { getClientIp } from './ip.util';

/**
 * Authenticated principal fields relevant to an access-denied audit entry.
 */
export interface AuditPrincipal {
  id?: string;
  orgId?: string;
  email?: string;
}

/**
 * Structured audit context describing who was denied access and where.
 * Emitted as a `Logger.warn` payload whenever a guard rejects a request
 * with a 403 (wrong role or IP allowlist), so that silent denials become
 * auditable.
 */
export interface AccessDeniedAuditContext {
  method: string;
  path: string;
  clientIp: string | null;
  userId?: string;
  orgId?: string;
  email?: string;
}

/**
 * Build the audit context for a forbidden request from the incoming HTTP
 * request and the authenticated principal (if one was resolved).
 */
export function buildAccessDeniedAuditContext(
  request: Request,
  principal?: AuditPrincipal,
): AccessDeniedAuditContext {
  return {
    method: request.method,
    path: request.url,
    clientIp: getClientIp(request),
    userId: principal?.id,
    orgId: principal?.orgId,
    email: principal?.email,
  };
}
