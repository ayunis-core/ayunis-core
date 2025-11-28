import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { ProviderUsage } from '../../../../domain/provider-usage.entity';
import { TimeSeriesPoint } from '../../../../domain/time-series-point.entity';
import { ModelDistribution } from '../../../../domain/model-distribution.entity';
import { ModelBreakdownItem } from '../../../../domain/model-breakdown-item.entity';
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
          tokens: parseInt(point.tokens),
          requests: parseInt(point.requests),
          cost: point.cost ? parseFloat(point.cost) : undefined,
        }),
    );
  }

  mapProviderRow(
    row: ProviderStatsRow,
    totalTokens: number,
    timeSeries?: TimeSeriesPoint[],
  ): ProviderUsage {
    const tokens = parseInt(row.tokens);
    const requests = parseInt(row.requests);
    const cost = row.cost ? parseFloat(row.cost) : undefined;
    const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
    return new ProviderUsage({
      provider: row.provider as ModelProvider,
      tokens,
      requests,
      cost,
      percentage,
      timeSeriesData: timeSeries ?? [],
    });
  }

  mapModelStatsToDistribution(rows: ModelStatsRow[]): {
    totalTokens: number;
    items: ModelDistribution[];
  } {
    const totalTokens = rows.reduce((sum, r) => sum + parseInt(r.tokens), 0);
    const items: ModelDistribution[] = rows.map((r) => {
      const tokens = parseInt(r.tokens);
      const requests = parseInt(r.requests);
      const cost = r.cost ? parseFloat(r.cost) : undefined;
      const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
      return new ModelDistribution({
        modelId: r.modelId as unknown as UUID,
        modelName: r.modelName || `model-${r.modelId.slice(0, 8)}`,
        displayName: r.displayName || `Model ${r.modelId.slice(0, 8)}`,
        provider: r.provider,
        tokens,
        requests,
        cost,
        percentage,
      });
    });
    return { totalTokens, items };
  }

  mapUserModelStatsToBreakdown(rows: ModelStatsRow[]): ModelBreakdownItem[] {
    return rows.map(
      (r) =>
        new ModelBreakdownItem({
          modelId: r.modelId,
          modelName: r.modelName || `model-${r.modelId.slice(0, 8)}`,
          displayName: r.displayName || `Model ${r.modelId.slice(0, 8)}`,
          provider: r.provider,
          tokens: parseInt(r.tokens),
          requests: parseInt(r.requests),
          cost: r.cost ? parseFloat(r.cost) : undefined,
        }),
    );
  }

  mapTopModelRows(rows: TopModelRow[]): string[] {
    return rows.map((m) => m.displayName || `model-${m.modelId.slice(0, 8)}`);
  }
}
