import { Injectable } from '@nestjs/common';
import { ProviderUsage } from 'src/domain/usage/domain/provider-usage.entity';
import { TimeSeriesPoint } from 'src/domain/usage/domain/time-series-point.entity';
import { ModelDistribution } from 'src/domain/usage/domain/model-distribution.entity';
import type {
  ModelStatsRow,
  ProviderStatsRow,
  TimeSeriesRow,
  TopModelRow,
} from '../queries/usage-query.types';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

@Injectable()
export class UsageQueryMapper {
  mapTimeSeriesRows(rows: TimeSeriesRow[]): TimeSeriesPoint[] {
    return rows.map(
      (point) =>
        new TimeSeriesPoint({
          date: new Date(point.date),
          credits: Number(point.credits) || 0,
          requests: parseInt(point.requests, 10),
        }),
    );
  }

  mapProviderRow(
    row: ProviderStatsRow,
    totalCredits: number,
    timeSeries?: TimeSeriesPoint[],
  ): ProviderUsage {
    const credits = Number(row.credits) || 0;
    const requests = parseInt(row.requests, 10);
    const percentage = totalCredits > 0 ? (credits / totalCredits) * 100 : 0;
    return new ProviderUsage({
      provider: row.provider as ModelProvider,
      credits,
      requests,
      percentage,
      timeSeriesData: timeSeries ?? [],
    });
  }

  mapModelStatsToDistribution(rows: ModelStatsRow[]): {
    totalCredits: number;
    items: ModelDistribution[];
  } {
    const totalCredits = rows.reduce(
      (sum, r) => sum + (Number(r.credits) || 0),
      0,
    );
    const items: ModelDistribution[] = rows.map((r) => {
      const credits = Number(r.credits) || 0;
      const requests = parseInt(r.requests, 10);
      const percentage = totalCredits > 0 ? (credits / totalCredits) * 100 : 0;
      return new ModelDistribution({
        modelId: r.modelId,
        modelName: r.modelName || `model-${r.modelId.slice(0, 8)}`,
        displayName: r.displayName || `Model ${r.modelId.slice(0, 8)}`,
        provider: r.provider,
        credits,
        requests,
        percentage,
      });
    });
    return { totalCredits, items };
  }

  mapTopModelRows(rows: TopModelRow[]): string[] {
    return rows.map((m) => m.displayName || `model-${m.modelId.slice(0, 8)}`);
  }
}
