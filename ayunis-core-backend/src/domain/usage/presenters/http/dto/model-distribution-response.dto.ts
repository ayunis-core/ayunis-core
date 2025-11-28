import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

export class ModelDistributionDto {
  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiProperty({ description: 'Model name' })
  modelName: string;

  @ApiProperty({ description: 'Model display name' })
  displayName: string;

  @ApiProperty({ enum: ModelProvider, description: 'Model provider' })
  provider: ModelProvider;

  @ApiProperty({ description: 'Total tokens for this model' })
  tokens: number;

  @ApiProperty({ description: 'Total requests for this model' })
  requests: number;

  @ApiPropertyOptional({
    description: 'Total cost for this model (self-hosted mode only)',
  })
  cost?: number;

  @ApiProperty({ description: 'Percentage of total usage' })
  percentage: number;
}

export class ModelDistributionResponseDto {
  @ApiProperty({
    description: 'Model distribution statistics',
    type: [ModelDistributionDto],
  })
  models: ModelDistributionDto[];
}
