import type { Request } from 'express';

// Express applies the configured proxy trust boundary before exposing request.ip.
export function getClientIp(request: Request): string | null {
  return request.ip || request.socket.remoteAddress || null;
}
