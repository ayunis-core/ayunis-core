import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
import { ModelWithConfigResponseDto } from '../dto/model-with-config-response.dto';
import { Injectable } from '@nestjs/common';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ModelWithConfigResponseDtoMapper {
  toDto(
    allModelsWithConfig: ModelWithConfig[],
    permittedModels: PermittedModel[],
  ): ModelWithConfigResponseDto[] {
    return allModelsWithConfig.map((modelWithConfig) => {
      const permittedModel = permittedModels.find((permittedModel) =>
        modelWithConfig.model.equals(permittedModel.model),
      );
      const id = permittedModel?.id;
      const isPermitted = permittedModel !== undefined;
      const isDefault = permittedModel?.isDefault ?? false;
      return {
        id,
        name: modelWithConfig.model.name,
        provider: modelWithConfig.model.provider,
        displayName: modelWithConfig.config.displayName,
        canStream: modelWithConfig.config.canStream,
        isReasoning: modelWithConfig.config.isReasoning,
        isPermitted,
        isDefault,
      };
    });
  }
}
