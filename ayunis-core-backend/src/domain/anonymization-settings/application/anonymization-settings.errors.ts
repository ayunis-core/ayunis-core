import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

export enum AnonymizationSettingsErrorCode {
  INVALID_PATTERN = 'INVALID_PATTERN',
  DUPLICATE_CATEGORY = 'DUPLICATE_CATEGORY',
  UNEXPECTED_ERROR = 'UNEXPECTED_ANONYMIZATION_SETTINGS_ERROR',
  EMPTY_GLOBAL_WHITELIST_WORD = 'EMPTY_GLOBAL_WHITELIST_WORD',
  DUPLICATE_GLOBAL_WHITELIST_WORD = 'DUPLICATE_GLOBAL_WHITELIST_WORD',
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

export class DuplicateGlobalWhitelistWordError extends ApplicationError {
  constructor(category: PiiCategory, word: string, metadata?: ErrorMetadata) {
    super(
      `The word "${word}" is already on the global whitelist for category ${category}`,
      AnonymizationSettingsErrorCode.DUPLICATE_GLOBAL_WHITELIST_WORD,
      409,
      { category, word, ...metadata },
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
