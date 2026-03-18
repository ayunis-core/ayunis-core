import type { Request } from 'express';

/**
 * Extract client IP address from request.
 * Checks proxy headers in priority order: x-forwarded-for, x-real-ip,
 * cf-connecting-ip, then falls back to socket remote address.
 *
 * **Security note:** This function trusts proxy headers unconditionally.
 * Deployment must be behind a reverse proxy that strips/overwrites
 * client-supplied forwarding headers.
 */
export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }

  const cfConnectingIp = request.headers['cf-connecting-ip'];
  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    return cfConnectingIp;
  }

  return request.socket.remoteAddress || request.ip || null;
}
