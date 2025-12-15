import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

export class TimeSeriesPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: Date;

  @ApiProperty({ description: 'Number of tokens at this point' })
  tokens: number;

  @ApiProperty({ description: 'Number of requests at this point' })
  requests: number;
}

export class ProviderUsageDto {
  @ApiProperty({ enum: ModelProvider, description: 'Model provider' })
  provider: ModelProvider;

  @ApiProperty({ description: 'Total tokens for this provider' })
  tokens: number;

  @ApiProperty({ description: 'Total requests for this provider' })
  requests: number;

  @ApiProperty({ description: 'Percentage of total usage' })
  percentage: number;

  @ApiProperty({
    description: 'Time series data for this provider',
    type: [TimeSeriesPointDto],
  })
  timeSeriesData: TimeSeriesPointDto[];
}

export class ProviderUsageResponseDto {
  @ApiProperty({
    description: 'Provider usage statistics',
    type: [ProviderUsageDto],
  })
  providers: ProviderUsageDto[];
}
