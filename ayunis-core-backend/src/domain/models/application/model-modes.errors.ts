import type { UUID } from 'crypto';
import type { ErrorMetadata } from 'src/common/errors/base.error';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export enum ModelModeErrorCode {
  MODEL_TIER_NOT_ALLOWED_FOR_MODE = 'MODEL_TIER_NOT_ALLOWED_FOR_MODE',
}

export class ModelTierNotAllowedForModeError extends ApplicationError {
  constructor(modelId: UUID, mode: ModelMode, metadata?: ErrorMetadata) {
    super(
      `Model '${modelId}' does not have a tier allowed in mode '${mode}'`,
      ModelModeErrorCode.MODEL_TIER_NOT_ALLOWED_FOR_MODE,
      400,
      metadata,
    );
  }
}
