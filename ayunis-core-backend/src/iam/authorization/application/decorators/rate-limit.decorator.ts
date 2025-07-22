import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed
   */
  limit: number;
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  /**
   * Optional custom message when rate limit is exceeded
   */
  message?: string;
}

/**
 * Decorator to apply rate limiting to routes based on IP address
 *
 * @param options Rate limiting configuration
 * @example
 * ```typescript
 * @RateLimit({ limit: 100, windowMs: 15 * 60 * 1000 }) // 100 requests per 15 minutes
 * @Get('api-endpoint')
 * async getApiEndpoint() {
 *   // This endpoint is rate limited
 * }
 * ```
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
