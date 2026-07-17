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
import { RateLimitExceededError } from '../errors/rate-limit-exceeded.error';
import { getClientIp } from '../util/ip.util';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly store = new Map<string, RateLimitRecord>();
  private cleanupCounter = 0;

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

    const rateLimitOptions = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    if (!rateLimitOptions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = getClientIp(request);

    if (!clientIp) {
      this.logger.warn('Unable to determine client IP address');
      return true; // Allow request if IP cannot be determined
    }

    const key = `${clientIp}:${context.getClass().name}:${context.getHandler().name}`;
    const now = Date.now();

    // Clean up expired entries periodically
    this.cleanupExpiredEntries(now);

    return this.consumeQuota(key, clientIp, rateLimitOptions, now);
  }

  /**
   * Track the request against its window record; throws once the limit
   * within the window is exhausted.
   */
  private consumeQuota(
    key: string,
    clientIp: string,
    rateLimitOptions: RateLimitOptions,
    now: number,
  ): boolean {
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
      this.throwLimitExceeded(key, clientIp, rateLimitOptions, record, now);
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

  private throwLimitExceeded(
    key: string,
    clientIp: string,
    rateLimitOptions: RateLimitOptions,
    record: RateLimitRecord,
    now: number,
  ): never {
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

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanupExpiredEntries(now: number): void {
    // Only cleanup every 1000 requests to avoid performance impact
    this.cleanupCounter = (this.cleanupCounter + 1) % 1000;
    if (this.cleanupCounter === 0) {
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
