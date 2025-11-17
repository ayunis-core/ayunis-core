import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';
import { RateLimitExceededError } from '../authorization.errors';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitRecord>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    this.logger.debug('Rate limit guard canActivate');
    const isProduction = this.configService.get<boolean>('app.isProduction');
    if (!isProduction) {
      return true;
    }

    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    if (!clientIp) {
      this.logger.warn('Unable to determine client IP address');
      return true; // Allow request if IP cannot be determined
    }

    const key = `${clientIp}:${context.getClass().name}:${context.getHandler().name}`;
    const now = Date.now();

    // Clean up expired entries periodically
    this.cleanupExpiredEntries(now);

    let record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired record
      record = {
        count: 1,
        resetTime: now + rateLimitOptions.windowMs,
      };
      this.store.set(key, record);

      this.logger.debug('Rate limit: new window started', {
        clientIp,
        key,
        count: record.count,
        limit: rateLimitOptions.limit,
        resetTime: new Date(record.resetTime).toISOString(),
      });

      return true;
    }

    // Increment counter
    record.count++;

    if (record.count > rateLimitOptions.limit) {
      const timeToReset = record.resetTime - now;

      this.logger.warn('Rate limit exceeded', {
        clientIp,
        key,
        count: record.count,
        limit: rateLimitOptions.limit,
        timeToResetMs: timeToReset,
      });

      throw new RateLimitExceededError(
        rateLimitOptions.message ||
          `Rate limit exceeded. Try again in ${Math.ceil(timeToReset / 1000)} seconds.`,
        {
          clientIp,
          limit: rateLimitOptions.limit,
          windowMs: rateLimitOptions.windowMs,
          retryAfter: Math.ceil(timeToReset / 1000),
        },
      );
    }

    this.logger.debug('Rate limit: request allowed', {
      clientIp,
      key,
      count: record.count,
      limit: rateLimitOptions.limit,
      remaining: rateLimitOptions.limit - record.count,
    });

    return true;
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: Request): string | null {
    // Check various headers that might contain the real IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
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

    // Fallback to connection remote address
    return request.socket?.remoteAddress || request.ip || null;
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanupExpiredEntries(now: number): void {
    // Only cleanup every 1000 requests to avoid performance impact
    if (Math.random() < 0.001) {
      const expiredKeys: string[] = [];

      for (const [key, record] of this.store.entries()) {
        if (now > record.resetTime) {
          expiredKeys.push(key);
        }
      }

      expiredKeys.forEach((key) => this.store.delete(key));

      if (expiredKeys.length > 0) {
        this.logger.debug(
          `Cleaned up ${expiredKeys.length} expired rate limit entries`,
        );
      }
    }
  }
}
