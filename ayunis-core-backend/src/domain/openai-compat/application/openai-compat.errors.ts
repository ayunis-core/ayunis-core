import { ApplicationError } from 'src/common/errors/base.error';
import type { ErrorMetadata } from 'src/common/errors/base.error';

export enum OpenAICompatErrorCode {
  INVALID_REQUEST = 'OPENAI_COMPAT_INVALID_REQUEST',
  MODEL_NOT_FOUND = 'OPENAI_COMPAT_MODEL_NOT_FOUND',
  TOKEN_LIMIT = 'OPENAI_COMPAT_TOKEN_LIMIT',
  CONTENT_TOO_LARGE = 'OPENAI_COMPAT_CONTENT_TOO_LARGE',
  USAGE_ACCOUNTING_FAILED = 'OPENAI_COMPAT_USAGE_ACCOUNTING_FAILED',
  UNEXPECTED = 'OPENAI_COMPAT_UNEXPECTED',
}

export class OpenAIInvalidRequestError extends ApplicationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(reason, OpenAICompatErrorCode.INVALID_REQUEST, 400, metadata);
  }
}

export class OpenAIContentTooLargeError extends ApplicationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(reason, OpenAICompatErrorCode.CONTENT_TOO_LARGE, 413, metadata);
  }
}

export class OpenAIModelNotFoundError extends ApplicationError {
  constructor(modelName: string) {
    super(
      `The model '${modelName}' does not exist or you do not have access to it`,
      OpenAICompatErrorCode.MODEL_NOT_FOUND,
      404,
      { modelName },
    );
  }
}

export class OpenAITokenLimitError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Model response hit the token limit while emitting a tool call',
      OpenAICompatErrorCode.TOKEN_LIMIT,
      422,
      metadata,
    );
  }
}

/**
 * The provider call already completed or consumed tokens but its usage could
 * not be recorded — either the provider reported none for a paid model or the
 * critical write failed. Retrying would bill another call for a request whose
 * accounting is already broken, so the error is terminal for the caller.
 */
export class OpenAIUsageAccountingFailedError extends ApplicationError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Usage of the completed model call could not be recorded',
      OpenAICompatErrorCode.USAGE_ACCOUNTING_FAILED,
      500,
      metadata,
    );
  }
}

export class OpenAIUnexpectedError extends ApplicationError {
  constructor(error: unknown) {
    super('Unexpected error occurred', OpenAICompatErrorCode.UNEXPECTED, 500, {
      error,
    });
  }
}
