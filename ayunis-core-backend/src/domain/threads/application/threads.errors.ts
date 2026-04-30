import type { UUID } from 'crypto';
import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';

export enum ThreadErrorCode {
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  THREAD_CREATION_FAILED = 'THREAD_CREATION_FAILED',
  MESSAGE_ADDITION_FAILED = 'MESSAGE_ADDITION_FAILED',
  SOURCE_ALREADY_ASSIGNED = 'SOURCE_ALREADY_ASSIGNED',
  SOURCE_LIMIT_EXCEEDED = 'SOURCE_LIMIT_EXCEEDED',
  SOURCE_ADDITION_FAILED = 'SOURCE_ADDITION_FAILED',
  SOURCE_REMOVAL_FAILED = 'SOURCE_REMOVAL_FAILED',
  SOURCE_NOT_FOUND = 'SOURCE_NOT_FOUND',
  THREAD_UPDATE_FAILED = 'THREAD_UPDATE_FAILED',
  MODEL_REPLACEMENT_FAILED = 'MODEL_REPLACEMENT_FAILED',
  NO_MODEL_OR_AGENT_PROVIDED = 'NO_MODEL_OR_AGENT_PROVIDED',
  GENERATED_IMAGE_NOT_FOUND = 'GENERATED_IMAGE_NOT_FOUND',
  GENERATED_IMAGE_SAVE_FAILED = 'GENERATED_IMAGE_SAVE_FAILED',
  UNSUPPORTED_IMAGE_CONTENT_TYPE = 'UNSUPPORTED_IMAGE_CONTENT_TYPE',
  UNEXPECTED_THREAD_ERROR = 'UNEXPECTED_THREAD_ERROR',
}

/**
 * Base thread error that all thread-specific errors should extend
 */
export abstract class ThreadError extends ApplicationError {
  constructor(
    message: string,
    code: ThreadErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }
}

export class ThreadNotFoundError extends ThreadError {
  constructor(threadId: string, userId?: string, metadata?: ErrorMetadata) {
    super(
      `Thread with ID '${threadId}' not found` +
        (userId ? ` for user '${userId}'` : ''),
      ThreadErrorCode.THREAD_NOT_FOUND,
      404,
      {
        threadId,
        ...(userId && { userId }),
        ...metadata,
      },
    );
  }
}

export class ThreadCreationError extends ThreadError {
  constructor(error: Error, userId?: string, metadata?: ErrorMetadata) {
    super(
      `Failed to create thread: ${error.message}`,
      ThreadErrorCode.THREAD_CREATION_FAILED,
      500,
      {
        originalError: error.message,
        ...(userId && { userId }),
        ...metadata,
      },
    );
  }
}

export class MessageAdditionError extends ThreadError {
  constructor(threadId: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to add message to thread '${threadId}': ${error.message}`,
      ThreadErrorCode.MESSAGE_ADDITION_FAILED,
      500,
      {
        threadId,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}

export class SourceAlreadyAssignedError extends ThreadError {
  constructor(sourceId: string, metadata?: ErrorMetadata) {
    super(
      `Source with ID ${sourceId} is already assigned to a thread`,
      ThreadErrorCode.SOURCE_ALREADY_ASSIGNED,
      409,
      metadata,
    );
  }
}

export class ThreadSourceLimitExceededError extends ThreadError {
  constructor(limit: number, metadata?: ErrorMetadata) {
    super(
      `Cannot add more than ${limit} sources to a thread`,
      ThreadErrorCode.SOURCE_LIMIT_EXCEEDED,
      409,
      { limit, ...metadata },
    );
  }
}

export class SourceAdditionError extends ThreadError {
  constructor(threadId: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to add source to thread '${threadId}': ${error.message}`,
      ThreadErrorCode.SOURCE_ADDITION_FAILED,
      500,
      {
        threadId,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}

export class SourceRemovalError extends ThreadError {
  constructor(threadId: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to remove source from thread '${threadId}': ${error.message}`,
      ThreadErrorCode.SOURCE_REMOVAL_FAILED,
      500,
      {
        threadId,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}

export class SourceNotFoundError extends ThreadError {
  constructor(sourceId: string, metadata?: ErrorMetadata) {
    super(
      `Source with ID '${sourceId}' not found`,
      ThreadErrorCode.SOURCE_NOT_FOUND,
      404,
      {
        sourceId,
        ...metadata,
      },
    );
  }
}

export class ThreadUpdateError extends ThreadError {
  constructor(threadId: string, error: Error, metadata?: ErrorMetadata) {
    super(
      `Failed to update thread '${threadId}': ${error.message}`,
      ThreadErrorCode.THREAD_UPDATE_FAILED,
      500,
      {
        threadId,
        originalError: error.message,
        ...metadata,
      },
    );
  }
}

export class ModelReplacementError extends ThreadError {
  constructor(threadId: UUID, modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Failed to replace model in thread '${threadId}' with model '${modelId}'`,
      ThreadErrorCode.MODEL_REPLACEMENT_FAILED,
      500,
      {
        threadId,
        modelId,
        ...metadata,
      },
    );
  }
}

export class NoModelOrAgentProvidedError extends ThreadError {
  constructor(userId?: string, metadata?: ErrorMetadata) {
    super(
      'No model or agent provided',
      ThreadErrorCode.NO_MODEL_OR_AGENT_PROVIDED,
      400,
      {
        ...(userId && { userId }),
        ...metadata,
      },
    );
  }
}

export class GeneratedImageNotFoundError extends ThreadError {
  constructor(imageId: string, metadata?: ErrorMetadata) {
    super(
      `Generated image '${imageId}' not found`,
      ThreadErrorCode.GENERATED_IMAGE_NOT_FOUND,
      404,
      { imageId, ...metadata },
    );
  }
}

export class GeneratedImageSaveFailedError extends ThreadError {
  /** Original cause — available for logging but not serialized to the client. */
  public readonly cause: Error;

  constructor(error: Error, metadata?: ErrorMetadata) {
    super(
      'Failed to save generated image',
      ThreadErrorCode.GENERATED_IMAGE_SAVE_FAILED,
      500,
      metadata,
    );
    this.cause = error;
  }
}

export class UnsupportedImageContentTypeError extends ThreadError {
  constructor(contentType: string, metadata?: ErrorMetadata) {
    super(
      `Unsupported image content type: ${contentType}`,
      ThreadErrorCode.UNSUPPORTED_IMAGE_CONTENT_TYPE,
      400,
      {
        contentType,
        ...metadata,
      },
    );
  }
}

export class UnexpecteThreadError extends ThreadError {
  constructor(_error: Error, metadata?: ErrorMetadata) {
    super(
      'Unexpected thread error',
      ThreadErrorCode.UNEXPECTED_THREAD_ERROR,
      500,
      {
        ...metadata,
      },
    );
  }
}
