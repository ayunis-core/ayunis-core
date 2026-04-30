import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum ApiKeyErrorCode {
  API_KEY_NOT_FOUND = 'API_KEY_NOT_FOUND',
  API_KEY_INVALID_INPUT = 'API_KEY_INVALID_INPUT',
  API_KEY_EXPIRATION_IN_PAST = 'API_KEY_EXPIRATION_IN_PAST',
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_KEY_EXPIRED = 'API_KEY_EXPIRED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  UNEXPECTED_API_KEY_ERROR = 'UNEXPECTED_API_KEY_ERROR',
}

export abstract class ApiKeyError extends ApplicationError {
  constructor(
    message: string,
    code: ApiKeyErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class ApiKeyNotFoundError extends ApiKeyError {
  constructor(apiKeyId: string, metadata?: ErrorMetadata) {
    super(
      `API key with ID '${apiKeyId}' not found`,
      ApiKeyErrorCode.API_KEY_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class ApiKeyInvalidInputError extends ApiKeyError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid API key input: ${reason}`,
      ApiKeyErrorCode.API_KEY_INVALID_INPUT,
      400,
      metadata,
    );
  }
}

export class ApiKeyExpirationInPastError extends ApiKeyError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'API key expiration date must be in the future',
      ApiKeyErrorCode.API_KEY_EXPIRATION_IN_PAST,
      400,
      metadata,
    );
  }
}

export class ApiKeyInvalidError extends ApiKeyError {
  constructor(metadata?: ErrorMetadata) {
    super('Invalid API key', ApiKeyErrorCode.API_KEY_INVALID, 401, metadata);
  }
}

export class ApiKeyExpiredError extends ApiKeyError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'API key has expired',
      ApiKeyErrorCode.API_KEY_EXPIRED,
      401,
      metadata,
    );
  }
}

export class ApiKeyRevokedError extends ApiKeyError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'API key has been revoked',
      ApiKeyErrorCode.API_KEY_REVOKED,
      401,
      metadata,
    );
  }
}

export class UnexpectedApiKeyError extends ApiKeyError {
  constructor() {
    super(
      'Unexpected error occurred',
      ApiKeyErrorCode.UNEXPECTED_API_KEY_ERROR,
      500,
    );
  }
}
