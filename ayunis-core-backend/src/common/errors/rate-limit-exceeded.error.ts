import type { ErrorMetadata } from './base.error';
import { ApplicationError } from './base.error';

export const RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED';

export class RateLimitExceededError extends ApplicationError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(reason || 'Rate limit exceeded', RATE_LIMIT_EXCEEDED, 429, metadata);
  }
}
