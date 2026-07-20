import { Injectable } from '@nestjs/common';
import { ProviderUsage } from 'src/domain/usage/domain/provider-usage.entity';
import {
  ProviderTimeSeriesRowDto,
  ProviderUsageChartResponseDto,
} from '../dto/provider-usage-chart-response.dto';
import { ProviderValuesDto } from '../dto/provider-values.dto';

@Injectable()
export class ProviderUsageChartResponseDtoMapper {
  toDto(providerUsage: ProviderUsage[]): ProviderUsageChartResponseDto {
    const dateSet = new Set<string>();

    // Index credits by provider/date for fast lookup
    const providerToDateCredits: Record<string, Record<string, number>> = {};

    for (const p of providerUsage) {
      providerToDateCredits[p.provider] = {};
      for (const pt of p.timeSeriesData) {
        const iso =
          pt.date instanceof Date
            ? pt.date.toISOString()
            : new Date(pt.date).toISOString();
        dateSet.add(iso);
        providerToDateCredits[p.provider][iso] =
          (providerToDateCredits[p.provider][iso] || 0) + (pt.credits || 0);
      }
    }

    const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
    const providers = Object.keys(providerToDateCredits);

    const rows: ProviderTimeSeriesRowDto[] = dates.map((iso) => {
      const values: ProviderValuesDto = {};
      for (const provider of providers) {
        (values as Record<string, number>)[provider] =
          providerToDateCredits[provider][iso] || 0;
      }
      return { date: new Date(iso), values };
    });

    return { timeSeries: rows };
  }
}
