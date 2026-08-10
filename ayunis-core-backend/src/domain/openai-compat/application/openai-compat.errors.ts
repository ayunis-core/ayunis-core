import { ApplicationError } from 'src/common/errors/base.error';
import type { ErrorMetadata } from 'src/common/errors/base.error';

export enum OpenAICompatErrorCode {
  INVALID_REQUEST = 'OPENAI_COMPAT_INVALID_REQUEST',
  MODEL_NOT_FOUND = 'OPENAI_COMPAT_MODEL_NOT_FOUND',
  TOKEN_LIMIT = 'OPENAI_COMPAT_TOKEN_LIMIT',
  UNEXPECTED = 'OPENAI_COMPAT_UNEXPECTED',
}

export class OpenAIInvalidRequestError extends ApplicationError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(reason, OpenAICompatErrorCode.INVALID_REQUEST, 400, metadata);
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

export class OpenAIUnexpectedError extends ApplicationError {
  constructor(error: unknown) {
    super('Unexpected error occurred', OpenAICompatErrorCode.UNEXPECTED, 500, {
      error,
    });
  }
}
