import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

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
