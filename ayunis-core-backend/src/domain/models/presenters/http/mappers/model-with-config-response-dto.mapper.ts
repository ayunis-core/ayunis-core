import { Model } from 'src/domain/models/domain/model.entity';
import { ModelWithConfigResponseDto } from '../dto/model-with-config-response.dto';
import { Injectable } from '@nestjs/common';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ModelWithConfigResponseDtoMapper {
  toDto(
    allModels: Model[],
    permittedModels: PermittedModel[],
  ): ModelWithConfigResponseDto[] {
    return allModels.map((model) => {
      const permittedModel = permittedModels.find(
        (permittedModel) => model.id === permittedModel.model.id,
      );
      const id = permittedModel?.id;
      const isPermitted = permittedModel !== undefined;
      const isDefault = permittedModel?.isDefault ?? false;
      return {
        modelId: model.id,
        permittedModelId: id,
        name: model.name,
        provider: model.provider,
        displayName: model.displayName,
        canStream: model.canStream,
        isReasoning: model.isReasoning,
        isPermitted,
        isDefault,
      };
    });
  }
}
