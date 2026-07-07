import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum OnboardingErrorCode {
  ONBOARDING_UNEXPECTED_ERROR = 'ONBOARDING_UNEXPECTED_ERROR',
}

export abstract class OnboardingError extends ApplicationError {
  constructor(
    message: string,
    code: OnboardingErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class OnboardingUnexpectedError extends OnboardingError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'An unexpected error occurred',
      OnboardingErrorCode.ONBOARDING_UNEXPECTED_ERROR,
      500,
      { ...metadata, error },
    );
  }
}
