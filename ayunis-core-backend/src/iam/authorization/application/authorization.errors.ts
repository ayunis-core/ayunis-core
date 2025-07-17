import { ApplicationError, ErrorMetadata } from 'src/common/errors/base.error';

export enum AuthorizationErrorCode {
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
}

export abstract class AuthorizationError extends ApplicationError {
  constructor(
    message: string,
    code: AuthorizationErrorCode,
    statusCode: number = 403,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class EmailNotVerifiedError extends AuthorizationError {
  constructor(reason?: string, metadata?: ErrorMetadata) {
    super(
      reason || 'Email not verified',
      AuthorizationErrorCode.EMAIL_NOT_VERIFIED,
      403,
      metadata,
    );
  }
}
