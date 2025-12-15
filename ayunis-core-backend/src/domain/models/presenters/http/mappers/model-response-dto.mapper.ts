import { Injectable } from '@nestjs/common';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { PermittedLanguageModelResponseDto } from '../dto/permitted-language-model-response.dto';
import { PermittedEmbeddingModelResponseDto } from '../dto/permitted-embedding-model-response.dto';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedEmbeddingModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ModelResponseDtoMapper {
  toLanguageModelDto(
    permittedModel: PermittedLanguageModel,
  ): PermittedLanguageModelResponseDto {
    return {
      id: permittedModel.id,
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
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
    return {
      id: permittedModel.id,
      name: permittedModel.model.name,
      provider: permittedModel.model.provider,
      displayName: permittedModel.model.displayName,
      type: ModelType.EMBEDDING,
      isArchived: permittedModel.model.isArchived,
      dimensions: permittedModel.model.dimensions,
      // Note: Cost fields (inputTokenCost, outputTokenCost, currency) are intentionally
      // not exposed to users. They are tracked internally for usage analytics only.
    };
  }
}
