import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

const DEFAULT_BASEMAP_TILE_URL =
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
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

  constructor(
    @InjectPinoLogger(SecurityHeadersMiddleware.name)
    private readonly logger: PinoLogger,
  ) {
    this.logger.info(
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
