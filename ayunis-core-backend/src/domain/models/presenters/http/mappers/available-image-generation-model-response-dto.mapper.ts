import { Injectable } from '@nestjs/common';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { AvailableImageGenerationModelResponseDto } from '../dto/available-image-generation-model-response.dto';

@Injectable()
export class AvailableImageGenerationModelResponseDtoMapper {
  toDto(
    models: ImageGenerationModel[],
    permittedModels: PermittedImageGenerationModel[],
  ): AvailableImageGenerationModelResponseDto[] {
    return models.map((model) => {
      const permittedModel = permittedModels.find(
        (candidate) => candidate.model.id === model.id,
      );
      return {
        modelId: model.id,
        permittedModelId: permittedModel?.id,
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        type: ModelType.IMAGE_GENERATION,
        isPermitted: permittedModel !== undefined,
        anonymousOnly: permittedModel?.anonymousOnly,
      };
    });
  }
}
