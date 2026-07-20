import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class ModelDistributionDto {
  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiProperty({ description: 'Model name' })
  modelName: string;

  @ApiProperty({ description: 'Model display name' })
  displayName: string;

  @ApiProperty({ enum: ModelProvider, description: 'Model provider' })
  provider: ModelProvider;

  @ApiProperty({ description: 'Total credits for this model' })
  credits: number;

  @ApiProperty({ description: 'Total requests for this model' })
  requests: number;

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
