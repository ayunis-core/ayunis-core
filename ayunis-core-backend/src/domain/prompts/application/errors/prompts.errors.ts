import { UUID } from 'crypto';
import {
  ApplicationError,
  ErrorMetadata,
} from '../../../../common/errors/base.error';

export enum PromptErrorCode {
  PROMPT_NOT_FOUND = 'PROMPT_NOT_FOUND',
  PROMPT_CREATION_ERROR = 'PROMPT_CREATION_ERROR',
  PROMPT_UPDATE_ERROR = 'PROMPT_UPDATE_ERROR',
  PROMPT_DELETION_ERROR = 'PROMPT_DELETION_ERROR',
}

/**
 * Base prompt error that all prompt-specific errors should extend
 */
export abstract class PromptError extends ApplicationError {
  constructor(
    message: string,
    code: PromptErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class PromptNotFoundError extends PromptError {
  constructor(id: UUID, userId: UUID, metadata?: ErrorMetadata) {
    super(
      `Prompt with id ${id} not found for user ${userId}`,
      PromptErrorCode.PROMPT_NOT_FOUND,
      404,
      {
        promptId: id,
        userId,
        ...metadata,
      },
    );
  }
}

export class PromptCreationError extends PromptError {
  constructor(error: Error, userId: UUID, metadata?: ErrorMetadata) {
    super(
      `Failed to create prompt for user ${userId}: ${error.message}`,
      PromptErrorCode.PROMPT_CREATION_ERROR,
      500,
      {
        originalError: error.message,
        userId,
        ...metadata,
      },
    );
  }
}

export class PromptUpdateError extends PromptError {
  constructor(error: Error, id: UUID, userId: UUID, metadata?: ErrorMetadata) {
    super(
      `Failed to update prompt ${id} for user ${userId}: ${error.message}`,
      PromptErrorCode.PROMPT_UPDATE_ERROR,
      500,
      {
        promptId: id,
        originalError: error.message,
        userId,
        ...metadata,
      },
    );
  }
}

export class PromptDeletionError extends PromptError {
  constructor(error: Error, id: UUID, userId: UUID, metadata?: ErrorMetadata) {
    super(
      `Failed to delete prompt ${id} for user ${userId}: ${error.message}`,
      PromptErrorCode.PROMPT_DELETION_ERROR,
      500,
      {
        promptId: id,
        originalError: error.message,
        userId,
        ...metadata,
      },
    );
  }
}
