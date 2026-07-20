import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class TimeSeriesPointDto {
  @ApiProperty({ description: 'Date of the data point' })
  date: Date;

  @ApiProperty({ description: 'Number of credits at this point' })
  credits: number;

  @ApiProperty({ description: 'Number of requests at this point' })
  requests: number;
}

export class ProviderUsageDto {
  @ApiProperty({ enum: ModelProvider, description: 'Model provider' })
  provider: ModelProvider;

  @ApiProperty({ description: 'Total credits for this provider' })
  credits: number;

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
