import type { Request } from 'express';
import type { ConfigService } from '@nestjs/config';
import { getAccessTokenCookieName } from './cookie.util';

const BEARER_HEADER = /^Bearer (\S+)$/i;

/**
 * Browser sessions carry the access token in a cookie, token clients (see the
 * session client registry) in `Authorization: Bearer`. The cookie wins when
 * both are present, so a stray header cannot replace a browser session.
 */
export function extractAccessToken(
  request: Request,
  configService: ConfigService,
): string | undefined {
  const cookies = request.cookies as Record<string, string> | undefined;
  const cookieToken = cookies?.[getAccessTokenCookieName(configService)];
  if (cookieToken) return cookieToken;
  return BEARER_HEADER.exec(request.headers.authorization ?? '')?.[1];
}
