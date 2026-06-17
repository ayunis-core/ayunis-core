import type { ErrorMetadata } from '../../../common/errors/base.error';
import { ApplicationError } from '../../../common/errors/base.error';
import type { ModelProvider } from '../domain/value-objects/model-provider.enum';
import type { UUID } from 'crypto';

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
  CANNOT_DELETE_DEFAULT_MODEL = 'CANNOT_DELETE_DEFAULT_MODEL',
  CANNOT_DELETE_LAST_MODEL = 'CANNOT_DELETE_LAST_MODEL',
  MODEL_ALREADY_EXISTS = 'MODEL_ALREADY_EXISTS',
  MODEL_UPDATE_FAILED = 'MODEL_UPDATE_FAILED',
  MODEL_CREATION_FAILED = 'MODEL_CREATION_FAILED',
  MODEL_PROVIDER_INFO_NOT_FOUND = 'MODEL_PROVIDER_INFO_NOT_FOUND',
  MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED = 'MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED',
  MULTIPLE_IMAGE_GENERATION_MODELS_NOT_ALLOWED = 'MULTIPLE_IMAGE_GENERATION_MODELS_NOT_ALLOWED',
  IMAGE_GENERATION_MODEL_PROVIDER_NOT_SUPPORTED = 'IMAGE_GENERATION_MODEL_PROVIDER_NOT_SUPPORTED',
  IMAGE_GENERATION_FAILED = 'IMAGE_GENERATION_FAILED',
  UNEXPECTED_MODEL_ERROR = 'UNEXPECTED_MODEL_ERROR',
  DUPLICATE_TEAM_PERMITTED_MODEL = 'DUPLICATE_TEAM_PERMITTED_MODEL',
  TEAM_NOT_FOUND_IN_ORG = 'TEAM_NOT_FOUND_IN_ORG',
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
      422,
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

export class PermittedEmbeddingModelNotFoundForOrgError extends ModelError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Permitted embedding model not found for org '${orgId}'`,
      ModelErrorCode.MODEL_NOT_FOUND,
      404,
      metadata,
    );
  }
}

export class PermittedImageGenerationModelNotFoundForOrgError extends ModelError {
  constructor(orgId: UUID, metadata?: ErrorMetadata) {
    super(
      `Permitted image generation model not found for org '${orgId}'`,
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

/** Error thrown when trying to delete the default model */
export class CannotDeleteDefaultModelError extends ModelError {
  constructor(modelId?: string, metadata?: ErrorMetadata) {
    super(
      `Cannot delete the default model. Please set another model as default first.`,
      ModelErrorCode.CANNOT_DELETE_DEFAULT_MODEL,
      400,
      { ...metadata, modelId },
    );
  }
}

/** Error thrown when trying to delete the last permitted language model */
export class CannotDeleteLastModelError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      `Cannot delete the last permitted language model in an organization.`,
      ModelErrorCode.CANNOT_DELETE_LAST_MODEL,
      400,
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

/**
 * Error thrown when multiple embedding models are not allowed
 */
export class MultipleEmbeddingModelsNotAllowedError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Multiple embedding models are not allowed',
      ModelErrorCode.MULTIPLE_EMBEDDING_MODELS_NOT_ALLOWED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when multiple image-generation models are not allowed.
 */
export class MultipleImageGenerationModelsNotAllowedError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Multiple image-generation models are not allowed',
      ModelErrorCode.MULTIPLE_IMAGE_GENERATION_MODELS_NOT_ALLOWED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when an image-generation model uses an unsupported provider.
 */
export class ImageGenerationModelProviderNotSupportedError extends ModelError {
  constructor(provider: ModelProvider, metadata?: ErrorMetadata) {
    super(
      `Image-generation models must use provider 'azure', received '${provider}'`,
      ModelErrorCode.IMAGE_GENERATION_MODEL_PROVIDER_NOT_SUPPORTED,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when a team-scoped permitted model already exists for the
 * given team + model combination.
 */
export class DuplicateTeamPermittedModelError extends ModelError {
  constructor(teamId: UUID, modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' is already permitted for team '${teamId}'`,
      ModelErrorCode.DUPLICATE_TEAM_PERMITTED_MODEL,
      409,
      metadata,
    );
  }
}

/**
 * Error thrown when the specified team does not exist in the caller's org.
 */
export class TeamNotFoundInOrgError extends ModelError {
  constructor(teamId: UUID, metadata?: ErrorMetadata) {
    super(
      `Team '${teamId}' not found in organization`,
      ModelErrorCode.TEAM_NOT_FOUND_IN_ORG,
      404,
      metadata,
    );
  }
}

/**
 * Error thrown when a permitted model does not belong to the specified team.
 */
export class PermittedModelNotInTeamError extends ModelError {
  constructor(permittedModelId: UUID, teamId: UUID, metadata?: ErrorMetadata) {
    super(
      `Permitted model '${permittedModelId}' does not belong to team '${teamId}'`,
      ModelErrorCode.MODEL_INVALID,
      400,
      metadata,
    );
  }
}

/**
 * Error thrown when image generation fails.
 */
export class ImageGenerationFailedError extends ModelError {
  constructor(reason: string, metadata?: ErrorMetadata) {
    super(
      `Image generation failed: ${reason}`,
      ModelErrorCode.IMAGE_GENERATION_FAILED,
      500,
      metadata,
    );
  }
}

/**
 * Error thrown when a non-language model is used where a language model is required.
 */
export class NotALanguageModelError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' is not a language model`,
      ModelErrorCode.MODEL_INVALID,
      400,
      metadata,
    );
  }
}
