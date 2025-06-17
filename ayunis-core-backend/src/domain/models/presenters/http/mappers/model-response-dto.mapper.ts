import { Injectable } from '@nestjs/common';
import { ModelWithConfig } from 'src/domain/models/domain/model-with-config.entity';
import { PermittedModelResponseDto } from '../dto/permitted-model-response.dto';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ModelResponseDtoMapper {
  toDto(
    model: ModelWithConfig,
    permittedModel: PermittedModel,
  ): PermittedModelResponseDto {
    if (!model.model.equals(permittedModel.model)) {
      throw new Error('Model and permitted model do not match');
    }
    return {
      id: permittedModel.id,
      name: model.model.name,
      provider: model.model.provider,
      displayName: model.config.displayName,
      canStream: model.config.canStream,
      isReasoning: model.config.isReasoning,
    };
  }
}
