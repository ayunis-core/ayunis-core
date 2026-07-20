import { Injectable } from '@nestjs/common';
import { ModelDistribution } from 'src/domain/usage/domain/model-distribution.entity';
import {
  ModelDistributionDto,
  ModelDistributionResponseDto,
} from '../dto/model-distribution-response.dto';

@Injectable()
export class ModelDistributionResponseDtoMapper {
  toDto(modelDistribution: ModelDistribution[]): ModelDistributionResponseDto {
    return {
      models: modelDistribution.map((model) => this.toModelDto(model)),
    };
  }

  private toModelDto(model: ModelDistribution): ModelDistributionDto {
    return {
      modelId: model.modelId,
      modelName: model.modelName,
      displayName: model.displayName,
      provider: model.provider,
      credits: model.credits,
      requests: model.requests,
      percentage: model.percentage,
    };
  }
}
