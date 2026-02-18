import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum ThreadTitleErrorCode {
  TITLE_GENERATION_FAILED = 'TITLE_GENERATION_FAILED',
  EMPTY_TITLE_RESPONSE = 'EMPTY_TITLE_RESPONSE',
  INVALID_TITLE_RESPONSE_TYPE = 'INVALID_TITLE_RESPONSE_TYPE',
}

/**
 * Base thread title error that all thread title-specific errors should extend
 */
export abstract class ThreadTitleError extends ApplicationError {
  constructor(
    message: string,
    code: ThreadTitleErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class TitleGenerationError extends ThreadTitleError {
  constructor(threadId: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to generate title for thread '${threadId}': ${error.message}`,
      ThreadTitleErrorCode.TITLE_GENERATION_FAILED,
      500,
      {
        threadId,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}

export class EmptyTitleResponseError extends ThreadTitleError {
  constructor(threadId: string, metadata?: ErrorMetadata) {
    super(
      `Empty title response received from LLM for thread '${threadId}'`,
      ThreadTitleErrorCode.EMPTY_TITLE_RESPONSE,
      500,
      {
        threadId,
        ...metadata,
      },
    );
  }
}

export class InvalidTitleResponseTypeError extends ThreadTitleError {
  constructor(threadId: string, actualType: string, metadata?: ErrorMetadata) {
    super(
      `Expected text response for title from LLM, got: ${actualType} for thread '${threadId}'`,
      ThreadTitleErrorCode.INVALID_TITLE_RESPONSE_TYPE,
      500,
      {
        threadId,
        actualType,
        ...metadata,
      },
    );
  }
}
