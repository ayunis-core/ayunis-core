import { Injectable } from '@nestjs/common';
import { Model } from 'src/domain/models/domain/model.entity';
import { PermittedModelResponseDto } from '../dto/permitted-model-response.dto';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class ModelResponseDtoMapper {
  toDto(
    model: Model,
    permittedModel: PermittedModel,
  ): PermittedModelResponseDto {
    if (model.id !== permittedModel.model.id) {
      throw new Error('Model and permitted model do not match');
    }
    return {
      id: permittedModel.id,
      name: model.name,
      provider: model.provider,
      displayName: model.displayName,
      canStream: model.canStream,
      isReasoning: model.isReasoning,
    };
  }
}
