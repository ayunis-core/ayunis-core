import type { ErrorMetadata } from './base.error';
import { ApplicationError } from './base.error';

export class UnauthorizedAccessError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super('Unauthorized access', 'UNAUTHORIZED_ACCESS', 403, metadata);
  }
}
