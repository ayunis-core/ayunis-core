import { Model } from 'src/domain/models/domain/model.entity';
import { ModelWithConfigResponseDto } from '../dto/model-with-config-response.dto';
import { Injectable } from '@nestjs/common';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

@Injectable()
export class ModelWithConfigResponseDtoMapper {
  private languageModelFields(model: Model) {
    if (!(model instanceof LanguageModel)) {
      return {
        canStream: false,
        isReasoning: false,
        canUseTools: false,
        canVision: false,
        tier: undefined,
        description: undefined,
      };
    }
    return {
      canStream: model.canStream,
      isReasoning: model.isReasoning,
      canUseTools: model.canUseTools,
      canVision: model.canVision,
      tier: model.tier,
      description: model.description,
    };
  }

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
        type: model.type,
        isPermitted,
        isDefault,
        anonymousOnly: permittedModel?.anonymousOnly,
        ...this.languageModelFields(model),
      };
    });
  }
}
