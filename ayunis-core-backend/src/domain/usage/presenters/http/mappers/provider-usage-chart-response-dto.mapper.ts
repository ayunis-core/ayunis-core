import { Injectable } from '@nestjs/common';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import {
  ProviderTimeSeriesRowDto,
  ProviderUsageChartResponseDto,
} from '../dto/provider-usage-chart-response.dto';
import { ProviderValuesDto } from '../dto/provider-values.dto';

@Injectable()
export class ProviderUsageChartResponseDtoMapper {
  toDto(providerUsage: ProviderUsage[]): ProviderUsageChartResponseDto {
    const dateSet = new Set<string>();

    // Index tokens by provider/date for fast lookup
    const providerToDateTokens: Record<string, Record<string, number>> = {};

    for (const p of providerUsage) {
      providerToDateTokens[p.provider] = {};
      for (const pt of p.timeSeriesData) {
        const iso =
          pt.date instanceof Date
            ? pt.date.toISOString()
            : new Date(pt.date).toISOString();
        dateSet.add(iso);
        providerToDateTokens[p.provider][iso] =
          (providerToDateTokens[p.provider][iso] || 0) + (pt.tokens || 0);
      }
    }

    const dates = Array.from(dateSet).sort();
    const providers = Object.keys(providerToDateTokens);

    const rows: ProviderTimeSeriesRowDto[] = dates.map((iso) => {
      const values: ProviderValuesDto = {};
      for (const provider of providers) {
        (values as Record<string, number>)[provider] =
          providerToDateTokens[provider][iso] || 0;
      }
      return { date: new Date(iso), values };
    });

    return { timeSeries: rows };
  }
}
