import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { ProviderUsage } from '../../../../domain/provider-usage.entity';
import { TimeSeriesPoint } from '../../../../domain/time-series-point.entity';
import { ModelDistribution } from '../../../../domain/model-distribution.entity';
import type {
  ModelStatsRow,
  ProviderStatsRow,
  TimeSeriesRow,
  TopModelRow,
} from '../queries/usage-query.types';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';

@Injectable()
export class UsageQueryMapper {
  mapTimeSeriesRows(rows: TimeSeriesRow[]): TimeSeriesPoint[] {
    return rows.map(
      (point) =>
        new TimeSeriesPoint({
          date: new Date(point.date),
          tokens: parseInt(point.tokens, 10),
          requests: parseInt(point.requests, 10),
        }),
    );
  }

  mapProviderRow(
    row: ProviderStatsRow,
    totalTokens: number,
    timeSeries?: TimeSeriesPoint[],
  ): ProviderUsage {
    const tokens = parseInt(row.tokens, 10);
    const requests = parseInt(row.requests, 10);
    const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
    return new ProviderUsage({
      provider: row.provider as ModelProvider,
      tokens,
      requests,
      percentage,
      timeSeriesData: timeSeries ?? [],
    });
  }

  mapModelStatsToDistribution(rows: ModelStatsRow[]): {
    totalTokens: number;
    items: ModelDistribution[];
  } {
    const totalTokens = rows.reduce(
      (sum, r) => sum + parseInt(r.tokens, 10),
      0,
    );
    const items: ModelDistribution[] = rows.map((r) => {
      const tokens = parseInt(r.tokens, 10);
      const requests = parseInt(r.requests, 10);
      const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
      return new ModelDistribution({
        modelId: r.modelId as unknown as UUID,
        modelName: r.modelName || `model-${r.modelId.slice(0, 8)}`,
        displayName: r.displayName || `Model ${r.modelId.slice(0, 8)}`,
        provider: r.provider,
        tokens,
        requests,
        percentage,
      });
    });
    return { totalTokens, items };
  }

  mapTopModelRows(rows: TopModelRow[]): string[] {
    return rows.map((m) => m.displayName || `model-${m.modelId.slice(0, 8)}`);
  }
}
