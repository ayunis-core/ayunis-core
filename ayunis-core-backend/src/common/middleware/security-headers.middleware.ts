import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

const DEFAULT_BASEMAP_TILE_URL =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  private helmetMiddleware = helmet({
    crossOriginEmbedderPolicy: false,
    ...(process.env.NODE_ENV !== 'production' && {
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', basemapOrigin()],
        'connect-src': [
          "'self'",
          'https://appsignal-endpoint.net',
          basemapOrigin(),
        ],
      },
    },
  });

  constructor() {
    this.logger.log(
      'Security headers middleware initialized with cookie-friendly settings',
    );
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.helmetMiddleware(req, res, next);
  }
}

function basemapOrigin(): string {
  const tileUrl =
    process.env.VITE_MAP_BASEMAP_TILE_URL?.trim() || DEFAULT_BASEMAP_TILE_URL;
  try {
    return new URL(tileUrl).origin;
  } catch {
    return new URL(DEFAULT_BASEMAP_TILE_URL).origin;
  }
}
