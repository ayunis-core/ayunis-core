import { ApplicationError } from 'src/common/errors/base.error';
import type { ErrorMetadata } from 'src/common/errors/base.error';

export enum OpenAICompatErrorCode {
  INVALID_REQUEST = 'OPENAI_COMPAT_INVALID_REQUEST',
  MODEL_NOT_FOUND = 'OPENAI_COMPAT_MODEL_NOT_FOUND',
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

export class OpenAIUnexpectedError extends ApplicationError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, OpenAICompatErrorCode.UNEXPECTED, 500, {
      ...metadata,
      error,
    });
  }
}
