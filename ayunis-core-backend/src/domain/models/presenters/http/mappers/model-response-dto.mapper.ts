import { Injectable } from '@nestjs/common';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { PermittedLanguageModelResponseDto } from '../dto/permitted-language-model-response.dto';
import { PermittedEmbeddingModelResponseDto } from '../dto/permitted-embedding-model-response.dto';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';
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
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
      providerDisplayName: providerInfo.displayName,
      displayName: permittedModel.model.displayName,
      type: ModelType.LANGUAGE,
      isArchived: permittedModel.model.isArchived,
      canStream: permittedModel.model.canStream,
      isReasoning: permittedModel.model.isReasoning,
      canVision: permittedModel.model.canVision,
      anonymousOnly: permittedModel.anonymousOnly,
      // Note: Cost fields (inputTokenCost, outputTokenCost, currency) are intentionally
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
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
      providerDisplayName: providerInfo.displayName,
      displayName: permittedModel.model.displayName,
      type: ModelType.EMBEDDING,
      isArchived: permittedModel.model.isArchived,
      dimensions: permittedModel.model.dimensions,
      // Note: Cost fields (inputTokenCost, outputTokenCost, currency) are intentionally
      // not exposed to users. They are tracked internally for usage analytics only.
    };
  }
}
