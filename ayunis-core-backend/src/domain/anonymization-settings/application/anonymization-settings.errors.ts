import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { WhitelistExceptionRejection } from 'src/domain/anonymization-settings/domain/whitelist-exception';

export enum AnonymizationSettingsErrorCode {
  INVALID_PATTERN = 'INVALID_PATTERN',
  DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY',
  INVALID_WHITELIST_EXCEPTION = 'INVALID_WHITELIST_EXCEPTION',
  UNEXPECTED_ERROR = 'UNEXPECTED_ANONYMIZATION_SETTINGS_ERROR',
  UNEXPECTED_WHITELIST_EXCEPTION_ERROR = 'UNEXPECTED_WHITELIST_EXCEPTION_ERROR',
  EMPTY_GLOBAL_WHITELIST_WORD = 'EMPTY_GLOBAL_WHITELIST_WORD',
  GLOBAL_WHITELIST_WORD_NOT_FOUND = 'GLOBAL_WHITELIST_WORD_NOT_FOUND',
  UNEXPECTED_GLOBAL_WHITELIST_ERROR = 'UNEXPECTED_GLOBAL_ANONYMIZATION_WHITELIST_ERROR',
}

export class EmptyGlobalWhitelistWordError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'A global whitelist word must not be empty',
      AnonymizationSettingsErrorCode.EMPTY_GLOBAL_WHITELIST_WORD,
      400,
      metadata,
    );
  }
}

export class GlobalWhitelistWordNotFoundError extends ApplicationError {
  constructor(wordId: string, metadata?: ErrorMetadata) {
    super(
      `Global whitelist word with ID ${wordId} not found`,
      AnonymizationSettingsErrorCode.GLOBAL_WHITELIST_WORD_NOT_FOUND,
      404,
      { wordId, ...metadata },
    );
  }
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

export class InvalidWhitelistExceptionError extends ApplicationError {
  constructor(
    category: PiiCategory,
    public readonly reason: WhitelistExceptionRejection,
  ) {
    super(
      `Invalid whitelist exception for category ${category}: ${reason}`,
      AnonymizationSettingsErrorCode.INVALID_WHITELIST_EXCEPTION,
      400,
      { category, reason },
    );
  }
}

export class UnexpectedWhitelistExceptionError extends ApplicationError {
  constructor(error: Error) {
    super(
      'Unexpected error while validating a whitelist exception',
      AnonymizationSettingsErrorCode.UNEXPECTED_WHITELIST_EXCEPTION_ERROR,
      500,
      { originalError: error.message },
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
