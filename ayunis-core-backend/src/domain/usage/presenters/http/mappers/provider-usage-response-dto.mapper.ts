import { Injectable } from '@nestjs/common';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import { TimeSeriesPoint } from '../../../domain/time-series-point.entity';
import {
  ProviderUsageResponseDto,
  ProviderUsageDto,
  TimeSeriesPointDto,
} from '../dto/provider-usage-response.dto';

@Injectable()
export class ProviderUsageResponseDtoMapper {
  toDto(providerUsage: ProviderUsage[]): ProviderUsageResponseDto {
    return {
      providers: providerUsage.map((provider) => this.toProviderDto(provider)),
    };
  }

  private toProviderDto(provider: ProviderUsage): ProviderUsageDto {
    return {
      provider: provider.provider,
      tokens: provider.tokens,
      requests: provider.requests,
      cost: provider.cost,
      percentage: provider.percentage,
      timeSeriesData: provider.timeSeriesData.map((point) =>
        this.toTimeSeriesDto(point),
      ),
    };
  }

  private toTimeSeriesDto(point: TimeSeriesPoint): TimeSeriesPointDto {
    return {
      date: point.date,
      tokens: point.tokens,
      requests: point.requests,
      cost: point.cost,
    };
  }
}
