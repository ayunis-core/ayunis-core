import { ApiProperty } from '@nestjs/swagger';
import { ProviderValuesDto } from './provider-values.dto';

export class ProviderTimeSeriesRowDto {
  @ApiProperty({
    description: 'Date of the data point',
    type: String,
    format: 'date-time',
  })
  date: Date;

  @ApiProperty({
    description: 'Tokens per provider for this date',
    type: ProviderValuesDto,
  })
  values: ProviderValuesDto;
}

export class ProviderUsageChartResponseDto {
  @ApiProperty({
    description: 'Aligned time series rows by date with provider token values',
    type: [ProviderTimeSeriesRowDto],
  })
  timeSeries: ProviderTimeSeriesRowDto[];
}
