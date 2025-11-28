import { Injectable } from '@nestjs/common';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { LanguageModelResponseDto } from '../dto/language-model-response.dto';
import { EmbeddingModelResponseDto } from '../dto/embedding-model-response.dto';
import { ModelResponseDto } from '../dto/model-response.dto';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { Model } from 'src/domain/models/domain/model.entity';

@Injectable()
export class CatalogModelResponseDtoMapper {
  toLanguageModelDto(model: LanguageModel): LanguageModelResponseDto {
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      displayName: model.displayName,
      type: ModelType.LANGUAGE,
      isArchived: model.isArchived,
      canStream: model.canStream,
      canUseTools: model.canUseTools,
      isReasoning: model.isReasoning,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  toEmbeddingModelDto(model: EmbeddingModel): EmbeddingModelResponseDto {
    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      displayName: model.displayName,
      type: ModelType.EMBEDDING,
      isArchived: model.isArchived,
      dimensions: model.dimensions,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  toDto(model: Model): ModelResponseDto {
    if (model instanceof LanguageModel) {
      return this.toLanguageModelDto(model);
    } else if (model instanceof EmbeddingModel) {
      return this.toEmbeddingModelDto(model);
    }
    throw new Error(`Unknown model type: ${model.constructor.name}`);
  }

  toDtoArray(models: Model[]): ModelResponseDto[] {
    return models.map((model) => this.toDto(model));
  }
}
