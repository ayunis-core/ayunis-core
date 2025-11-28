import { Injectable } from '@nestjs/common';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import { ModelDistributionResponseDto } from '../dto/model-distribution-response.dto';

@Injectable()
export class ModelDistributionResponseDtoMapper {
  toDto(modelDistribution: ModelDistribution[]): ModelDistributionResponseDto {
    return {
      models: modelDistribution.map((model) => ({
        modelId: model.modelId,
        modelName: model.modelName,
        displayName: model.displayName,
        provider: model.provider,
        tokens: model.tokens,
        requests: model.requests,
        cost: model.cost,
        percentage: model.percentage,
      })),
    };
  }
}
