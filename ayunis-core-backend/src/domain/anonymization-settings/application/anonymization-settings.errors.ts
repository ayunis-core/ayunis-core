import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export enum AnonymizationSettingsErrorCode {
  INVALID_PATTERN = 'INVALID_PATTERN',
  DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY',
  UNEXPECTED_ERROR = 'UNEXPECTED_ANONYMIZATION_SETTINGS_ERROR',
  UNEXPECTED_GLOBAL_WHITELIST_ERROR = 'UNEXPECTED_GLOBAL_ANONYMIZATION_WHITELIST_ERROR',
}

export class InvalidPatternError extends ApplicationError {
  constructor(category: PiiCategory, reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid whitelist pattern for category ${category}: ${reason}`,
      AnonymizationSettingsErrorCode.INVALID_PATTERN,
      400,
      { category, reason, ...metadata },
    );
  }
}

export class DuplicateCategoryError extends ApplicationError {
  constructor(category: PiiCategory, metadata?: ErrorMetadata) {
    super(
      `Whitelist contains category ${category} more than once`,
      AnonymizationSettingsErrorCode.DUPLICATE_CATEGORY,
      400,
      { category, ...metadata },
    );
  }
}

export class UnexpectedGlobalAnonymizationWhitelistError extends ApplicationError {
  constructor(error: Error) {
    super(
      'Unexpected global anonymization whitelist error',
      AnonymizationSettingsErrorCode.UNEXPECTED_GLOBAL_WHITELIST_ERROR,
      500,
      { originalError: error.message },
    );
  }
}

export class UnexpectedAnonymizationSettingsError extends ApplicationError {
  constructor(operation: string, metadata?: ErrorMetadata) {
    super(
      `Unexpected anonymization settings error during ${operation}`,
      AnonymizationSettingsErrorCode.UNEXPECTED_ERROR,
      500,
      { operation, ...metadata },
    );
  }
}
