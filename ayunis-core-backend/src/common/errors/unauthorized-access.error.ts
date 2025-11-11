import { ApplicationError, ErrorMetadata } from './base.error';

export class UnauthorizedAccessError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super('Unauthorized access', 'UNAUTHORIZED_ACCESS', 403, metadata);
  }
}
