import {
  ApplicationError,
  ErrorMetadata,
} from '../../../common/errors/base.error';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ModelProvider } from '../domain/value-objects/model-provider.enum';
import { UUID } from 'crypto';

/**
 * Error codes specific to the Models domain
 */
export enum ModelErrorCode {
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  NO_DEFAULT_MODEL_FOUND = 'NO_DEFAULT_MODEL_FOUND',
  MODEL_INVALID = 'MODEL_INVALID',
  MODEL_PROVIDER_NOT_SUPPORTED = 'MODEL_PROVIDER_NOT_SUPPORTED',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  INFERENCE_INPUT_INVALID = 'INFERENCE_INPUT_INVALID',
  INFERENCE_TIMEOUT = 'INFERENCE_TIMEOUT',
  MODEL_RATE_LIMIT_EXCEEDED = 'MODEL_RATE_LIMIT_EXCEEDED',
  MODEL_DELETION_FAILED = 'MODEL_DELETION_FAILED',
  MODEL_ALREADY_EXISTS = 'MODEL_ALREADY_EXISTS',
  MODEL_UPDATE_FAILED = 'MODEL_UPDATE_FAILED',
  MODEL_CREATION_FAILED = 'MODEL_CREATION_FAILED',
  MODEL_PROVIDER_INFO_NOT_FOUND = 'MODEL_PROVIDER_INFO_NOT_FOUND',
  UNEXPECTED_MODEL_ERROR = 'UNEXPECTED_MODEL_ERROR',
}

/**
 * Base model error that all model-specific errors should extend
 */
export abstract class ModelError extends ApplicationError {
  constructor(
    message: string,
    code: ModelErrorCode,
    statusCode: number = 400,
    metadata?: ErrorMetadata,
  ) {
    super(message, code, statusCode, metadata);
  }

  /**
   * Convert to a NestJS HTTP exception
   */
  toHttpException() {
    switch (this.statusCode) {
      case 404:
        return new NotFoundException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      case 409:
        return new ConflictException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
      default:
        return new BadRequestException({
          code: this.code,
          message: this.message,
          ...(this.metadata && { metadata: this.metadata }),
        });
    }
  }
}

export class UnexpectedModelError extends ModelError {
  constructor(error: Error, metadata?: ErrorMetadata) {
    super(error.message, ModelErrorCode.UNEXPECTED_MODEL_ERROR, 500, {
      ...metadata,
      error,
    });
  }
}

/**
 * Error thrown when a model provider is not supported
 */
export class ModelProviderNotSupportedError extends ModelError {
  constructor(provider: string, metadata?: ErrorMetadata) {
    super(
      `Model provider '${provider}' is not supported`,
      ModelErrorCode.MODEL_PROVIDER_NOT_SUPPORTED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when a model is not found
 */
export class ModelNotFoundError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' not found`,
      ModelErrorCode.MODEL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/** Error thrown when a default model is not found */
export class DefaultModelNotFoundError extends ModelError {
  constructor(orgId: string, metadata?: ErrorMetadata) {
    super(
      `Default model not found for org '${orgId}'`,
      ModelErrorCode.NO_DEFAULT_MODEL_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Errors thrown when a permitted model is not found
 */
export class PermittedModelNotFoundError extends ModelError {
  constructor(id: UUID, metadata?: ErrorMetadata) {
    super(
      `Permitted model '${id}' not found`,
      ModelErrorCode.MODEL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/** Error thrown when deletion fails */
export class PermittedModelDeletionFailedError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Permitted model deletion failed: ${reason}`,
      ModelErrorCode.MODEL_DELETION_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when model input is invalid
 */
export class ModelInvalidInputError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid model: ${reason}`,
      ModelErrorCode.MODEL_INVALID,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when inference fails
 */
export class InferenceFailedError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Inference failed: ${reason}`,
      ModelErrorCode.INFERENCE_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when inference input is invalid
 */
export class InferenceInputInvalidError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Invalid inference input: ${reason}`,
      ModelErrorCode.INFERENCE_INPUT_INVALID,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when inference times out
 */
export class InferenceTimeoutError extends ModelError {
  constructor(timeoutMs: number, metadata?: ErrorMetadata) {
    super(
      `Inference timed out after ${timeoutMs}ms`,
      ModelErrorCode.INFERENCE_TIMEOUT,
      408,
      metadata,
    );
  }
}

/**
 * Error thrown when model rate limit is exceeded
 */
export class ModelRateLimitExceededError extends ModelError {
  constructor(provider: string, metadata?: ErrorMetadata) {
    super(
      `Rate limit exceeded for provider '${provider}'`,
      ModelErrorCode.MODEL_RATE_LIMIT_EXCEEDED,
      429,
      metadata,
    );
  }
}

/**
 * Error thrown when trying to create a model that already exists
 */
export class ModelAlreadyExistsError extends ModelError {
  constructor(name: string, provider: ModelProvider, metadata?: ErrorMetadata) {
    super(
      `Model '${name}' with provider '${provider}' already exists`,
      ModelErrorCode.MODEL_ALREADY_EXISTS,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when model update fails
 */
export class ModelUpdateFailedError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Model update failed: ${reason}`,
      ModelErrorCode.MODEL_UPDATE_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when model creation fails
 */
export class ModelCreationFailedError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Model creation failed: ${reason}`,
      ModelErrorCode.MODEL_CREATION_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when a model is not found by ID
 */
export class ModelNotFoundByIdError extends ModelError {
  constructor(id: UUID, metadata?: ErrorMetadata) {
    super(
      `Model with ID '${id}' not found`,
      ModelErrorCode.MODEL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when a model is not found by name and provider
 */
export class ModelNotFoundByNameAndProviderError extends ModelError {
  constructor(name: string, provider: ModelProvider, metadata?: ErrorMetadata) {
    super(
      `Model '${name}' with provider '${provider}' not found`,
      ModelErrorCode.MODEL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when a model provider info is not found
 */
export class ModelProviderInfoNotFoundError extends ModelError {
  constructor(provider: ModelProvider, metadata?: ErrorMetadata) {
    super(
      `Model provider info for '${provider}' not found`,
      ModelErrorCode.MODEL_PROVIDER_INFO_NOT_FOUND,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when model deletion fails
 */
export class ModelDeletionFailedError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Model deletion failed: ${reason}`,
      ModelErrorCode.MODEL_DELETION_FAILED,
      500,
      metadata,
    );
  }
}
