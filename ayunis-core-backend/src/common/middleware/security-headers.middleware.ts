import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

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
