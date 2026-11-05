import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  MEMORY_CONTENT_MAX_LENGTH,
  MEMORY_DESCRIPTION_MAX_LENGTH,
  MEMORY_KEY_MAX_LENGTH,
  MEMORY_MAX_ENTRIES_PER_USER,
} from 'src/domain/memory/domain/memory.constants';

export enum MemoryErrorCode {
  INVALID_MEMORY_KEY = 'INVALID_MEMORY_KEY',
  MEMORY_CONTENT_TOO_LONG = 'MEMORY_CONTENT_TOO_LONG',
  MEMORY_DESCRIPTION_TOO_LONG = 'MEMORY_DESCRIPTION_TOO_LONG',
  MEMORY_ENTRY_LIMIT_REACHED = 'MEMORY_ENTRY_LIMIT_REACHED',
  UNEXPECTED_MEMORY_ERROR = 'UNEXPECTED_MEMORY_ERROR',
}

export class MemoryError extends ApplicationError {}

export class InvalidMemoryKeyError extends MemoryError {
  constructor(key: string) {
    super(
      `Invalid memory key "${key}". Keys must start with a lowercase letter, ` +
        `contain only lowercase letters, digits and underscores, and be at most ` +
        `${MEMORY_KEY_MAX_LENGTH} characters long.`,
      MemoryErrorCode.INVALID_MEMORY_KEY,
      400,
      { key },
    );
  }
}

export class MemoryContentTooLongError extends MemoryError {
  constructor(key: string, length: number) {
    super(
      `Memory content for "${key}" is ${length} characters long, ` +
        `which exceeds the limit of ${MEMORY_CONTENT_MAX_LENGTH}.`,
      MemoryErrorCode.MEMORY_CONTENT_TOO_LONG,
      400,
      { key, length },
    );
  }
}

export class MemoryDescriptionTooLongError extends MemoryError {
  constructor(key: string, length: number) {
    super(
      `Memory description for "${key}" is ${length} characters long, ` +
        `which exceeds the limit of ${MEMORY_DESCRIPTION_MAX_LENGTH}. ` +
        `Keep it to one line on when the entry is relevant.`,
      MemoryErrorCode.MEMORY_DESCRIPTION_TOO_LONG,
      400,
      { key, length },
    );
  }
}

export class MemoryEntryLimitReachedError extends MemoryError {
  constructor() {
    super(
      `Memory is full: at most ${MEMORY_MAX_ENTRIES_PER_USER} entries can be ` +
        `stored. Remove or merge an existing entry before adding a new one.`,
      MemoryErrorCode.MEMORY_ENTRY_LIMIT_REACHED,
      400,
    );
  }
}

export class UnexpectedMemoryError extends MemoryError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, MemoryErrorCode.UNEXPECTED_MEMORY_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}
