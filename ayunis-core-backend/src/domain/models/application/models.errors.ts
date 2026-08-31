import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { UUID } from 'crypto';

export enum ModelErrorCode {
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  NO_PERMITTED_EMBEDDING_MODEL = 'NO_PERMITTED_EMBEDDING_MODEL',
  NO_DEFAULT_MODEL_FOUND = 'NO_DEFAULT_MODEL_FOUND',
  MODEL_INVALID = 'MODEL_INVALID',
  MODEL_PROVIDER_NOT_SUPPORTED = 'MODEL_PROVIDER_NOT_SUPPORTED',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  INFERENCE_MALFORMED_TOOL_CALL = 'INFERENCE_MALFORMED_TOOL_CALL',
  INFERENCE_TOKEN_LIMIT = 'INFERENCE_TOKEN_LIMIT',
  INFERENCE_ABORTED = 'INFERENCE_ABORTED',
  INFERENCE_IMAGE_TOO_LARGE = 'INFERENCE_IMAGE_TOO_LARGE',
  INFERENCE_INPUT_INVALID = 'INFERENCE_INPUT_INVALID',
  INFERENCE_TIMEOUT = 'INFERENCE_TIMEOUT',
  MODEL_RATE_LIMIT_EXCEEDED = 'MODEL_RATE_LIMIT_EXCEEDED',
  MODEL_DELETION_FAILED = 'MODEL_DELETION_FAILED',
  MODEL_REFERENCED_BY_USAGE = 'MODEL_REFERENCED_BY_USAGE',
  MODEL_STILL_PERMITTED = 'MODEL_STILL_PERMITTED',
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
  MODEL_NOT_RESTRICTABLE_FOR_TEAM = 'MODEL_NOT_RESTRICTABLE_FOR_TEAM',
  MODEL_NOT_CONFIGURED = 'MODEL_NOT_CONFIGURED',
  MODEL_ARCHIVED = 'MODEL_ARCHIVED',
  MULTIPLE_TEAM_IMAGE_GENERATION_MODELS_NOT_ALLOWED = 'MULTIPLE_TEAM_IMAGE_GENERATION_MODELS_NOT_ALLOWED',
  EFFECTIVE_IMAGE_GENERATION_MODEL_CONFLICT = 'EFFECTIVE_IMAGE_GENERATION_MODEL_CONFLICT',
}

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
      ModelErrorCode.NO_PERMITTED_EMBEDDING_MODEL,
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

export class InferenceMalformedToolCallError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Inference failed: model emitted unparseable tool call arguments',
      ModelErrorCode.INFERENCE_MALFORMED_TOOL_CALL,
      500,
      metadata,
    );
  }
}

/** Distinct token-limit classification enables safe pre-output tool-call retries (AYC-669). */
export class InferenceTokenLimitError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Inference failed: model response hit the token limit while emitting a tool call',
      ModelErrorCode.INFERENCE_TOKEN_LIMIT,
      500,
      metadata,
    );
  }
}

/** Status 499 keeps expected client cancellations out of AppSignal incidents. */
export class InferenceAbortedError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Inference aborted by client',
      ModelErrorCode.INFERENCE_ABORTED,
      499,
      metadata,
    );
  }
}

/**
 * Error thrown when a provider rejects an image for exceeding its size limit
 * (Anthropic/Bedrock cap a single image at 5 MB base64). Distinct from the
 * generic InferenceFailedError so the UI can tell the user to shrink the image.
 */
export class InferenceImageTooLargeError extends ModelError {
  constructor(metadata?: ErrorMetadata) {
    super(
      'Image exceeds the provider size limit',
      ModelErrorCode.INFERENCE_IMAGE_TOO_LARGE,
      400,
      metadata,
    );
  }
}

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

/** A provider stream that went silent mid-response — see common/streaming/stream-idle-watchdog.ts. */
export class InferenceStreamStalledError extends ModelError {
  constructor(idleMs: number, metadata?: ErrorMetadata) {
    super(
      `Provider stream produced no data for ${idleMs}ms`,
      ModelErrorCode.INFERENCE_TIMEOUT,
      504,
      metadata,
    );
  }
}

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

export class ModelReferencedByUsageError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      'Cannot delete model because historical usage records reference it. Archive the model instead.',
      ModelErrorCode.MODEL_REFERENCED_BY_USAGE,
      409,
      { ...metadata, modelId },
    );
  }
}

export class ModelStillPermittedError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      'Cannot delete model while it is permitted for organizations. Remove all model permissions first.',
      ModelErrorCode.MODEL_STILL_PERMITTED,
      409,
      { ...metadata, modelId },
    );
  }
}
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
export class MultipleTeamImageGenerationModelsNotAllowedError extends ModelError {
  constructor(teamId: UUID, metadata?: ErrorMetadata) {
    super(
      `Team '${teamId}' can only be granted one image-generation model`,
      ModelErrorCode.MULTIPLE_TEAM_IMAGE_GENERATION_MODELS_NOT_ALLOWED,
      409,
      metadata,
    );
  }
}
export class EffectiveImageGenerationModelConflictError extends ModelError {
  constructor(orgId: UUID, modelIds: UUID[], metadata?: ErrorMetadata) {
    super(
      `Enabled teams in organization '${orgId}' grant conflicting image-generation models`,
      ModelErrorCode.EFFECTIVE_IMAGE_GENERATION_MODEL_CONFLICT,
      409,
      { ...metadata, orgId, modelIds },
    );
  }
}
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

export class ModelNotRestrictableForTeamError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' cannot be restricted at the team level`,
      ModelErrorCode.MODEL_NOT_RESTRICTABLE_FOR_TEAM,
      400,
      metadata,
    );
  }
}

export class ModelNotConfiguredError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' does not have configured provider credentials`,
      ModelErrorCode.MODEL_NOT_CONFIGURED,
      400,
      metadata,
    );
  }
}

export class ModelArchivedError extends ModelError {
  constructor(modelId: UUID, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' is archived`,
      ModelErrorCode.MODEL_ARCHIVED,
      400,
      metadata,
    );
  }
}
