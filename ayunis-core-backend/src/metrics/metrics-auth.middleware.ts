import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { MetricsConfig } from '../config/metrics.config';

@Injectable()
export class MetricsAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricsAuthMiddleware.name);
  private readonly user: string | undefined;
  private readonly password: string | undefined;
  private readonly authEnabled: boolean;

  constructor(configService: ConfigService) {
    const config = configService.get<MetricsConfig>('metrics')!;
    this.user = config.user;
    this.password = config.password;

    if (!this.user && !this.password) {
      this.logger.warn(
        'AYUNIS_METRICS_USER/PASSWORD not set — /metrics is unauthenticated',
      );
      this.authEnabled = false;
    } else if (!this.user || !this.password) {
      this.logger.warn(
        'Only one of AYUNIS_METRICS_USER/PASSWORD is set — both are required. ' +
          'Metrics endpoint will reject all requests until both are configured.',
      );
      this.authEnabled = true;
    } else {
      this.authEnabled = true;
    }
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.authEnabled) {
      next();
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Metrics"');
      res.status(401).send('Unauthorized');
      return;
    }

    const decoded = Buffer.from(
      authHeader.slice('Basic '.length),
      'base64',
    ).toString('utf-8');
    const [reqUser, ...rest] = decoded.split(':');
    const reqPass = rest.join(':');

    if (
      !this.user ||
      !this.password ||
      !this.timingSafeCompare(reqUser, this.user) ||
      !this.timingSafeCompare(reqPass, this.password)
    ) {
      res.status(401).send('Unauthorized');
      return;
    }

    next();
  }

  private timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');

    if (bufA.length !== bufB.length) {
      // Compare against self to consume constant time, then return false
      timingSafeEqual(bufA, bufA);
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  }
}
