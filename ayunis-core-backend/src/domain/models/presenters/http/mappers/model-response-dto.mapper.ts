import { Injectable } from '@nestjs/common';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { PermittedLanguageModelResponseDto } from '../dto/permitted-language-model-response.dto';
import { PermittedEmbeddingModelResponseDto } from '../dto/permitted-embedding-model-response.dto';
import { PermittedImageGenerationModelResponseDto } from '../dto/permitted-image-generation-model-response.dto';
import {
  PermittedModel,
  PermittedLanguageModel,
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { ModelProviderInfoRegistry } from 'src/domain/models/application/registry/model-provider-info.registry';

@Injectable()
export class ModelResponseDtoMapper {
  constructor(
    private readonly modelProviderInfoRegistry: ModelProviderInfoRegistry,
  ) {}

  toLanguageModelDto(
    permittedModel: PermittedLanguageModel,
  ): PermittedLanguageModelResponseDto {
    const providerInfo = this.modelProviderInfoRegistry.getModelProviderInfo(
      permittedModel.model.provider,
    );

    return {
      id: permittedModel.id,
      modelId: permittedModel.model.id,
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
      providerDisplayName: providerInfo.displayName,
      displayName: permittedModel.model.displayName,
      type: ModelType.LANGUAGE,
      isArchived: permittedModel.model.isArchived,
      canStream: permittedModel.model.canStream,
      isReasoning: permittedModel.model.isReasoning,
      canVision: permittedModel.model.canVision,
      isDefault: permittedModel.isDefault,
      anonymousOnly: permittedModel.anonymousOnly,
      // Note: Cost fields (inputTokenCost, outputTokenCost) are intentionally
      // not exposed to users. They are tracked internally for usage analytics only.
    };
  }

  toEmbeddingModelDto(
    permittedModel: PermittedEmbeddingModel,
  ): PermittedEmbeddingModelResponseDto {
    const providerInfo = this.modelProviderInfoRegistry.getModelProviderInfo(
      permittedModel.model.provider,
    );

    return {
      id: permittedModel.id,
      modelId: permittedModel.model.id,
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
      providerDisplayName: providerInfo.displayName,
      displayName: permittedModel.model.displayName,
      type: ModelType.EMBEDDING,
      isArchived: permittedModel.model.isArchived,
      dimensions: permittedModel.model.dimensions,
      anonymousOnly: permittedModel.anonymousOnly,
      // Note: Cost fields (inputTokenCost, outputTokenCost) are intentionally
      // not exposed to users. They are tracked internally for usage analytics only.
    };
  }

  toImageGenerationModelDto(
    permittedModel: PermittedImageGenerationModel,
  ): PermittedImageGenerationModelResponseDto {
    const providerInfo = this.modelProviderInfoRegistry.getModelProviderInfo(
      permittedModel.model.provider,
    );

    return {
      id: permittedModel.id,
      modelId: permittedModel.model.id,
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
      providerDisplayName: providerInfo.displayName,
      displayName: permittedModel.model.displayName,
      type: ModelType.IMAGE_GENERATION,
      isArchived: permittedModel.model.isArchived,
      anonymousOnly: permittedModel.anonymousOnly,
    };
  }

  toDto(
    permittedModel: PermittedModel,
  ):
    | PermittedLanguageModelResponseDto
    | PermittedEmbeddingModelResponseDto
    | PermittedImageGenerationModelResponseDto {
    if (permittedModel instanceof PermittedLanguageModel) {
      return this.toLanguageModelDto(permittedModel);
    }
    if (permittedModel instanceof PermittedEmbeddingModel) {
      return this.toEmbeddingModelDto(permittedModel);
    }
    if (permittedModel instanceof PermittedImageGenerationModel) {
      return this.toImageGenerationModelDto(permittedModel);
    }
    throw new Error(`Unknown model type: ${permittedModel.constructor.name}`);
  }
}
