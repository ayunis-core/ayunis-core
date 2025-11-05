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
} from '../queries/usage.queries';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';

export function mapTimeSeriesRows(rows: TimeSeriesRow[]): TimeSeriesPoint[] {
  return rows.map(
    (point) =>
      new TimeSeriesPoint(
        new Date(point.date),
        parseInt(point.tokens),
        parseInt(point.requests),
        point.cost ? parseFloat(point.cost) : undefined,
      ),
  );
}

export function mapProviderRow(
  row: ProviderStatsRow,
  totalTokens: number,
  timeSeries?: TimeSeriesPoint[],
): ProviderUsage {
  const tokens = parseInt(row.tokens);
  const requests = parseInt(row.requests);
  const cost = row.cost ? parseFloat(row.cost) : undefined;
  const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
  return new ProviderUsage(
    row.provider as ModelProvider,
    tokens,
    requests,
    cost,
    percentage,
    timeSeries ?? [],
  );
}

export function mapModelStatsToDistribution(rows: ModelStatsRow[]): {
  totalTokens: number;
  items: ModelDistribution[];
} {
  const totalTokens = rows.reduce((sum, r) => sum + parseInt(r.tokens), 0);
  const items: ModelDistribution[] = rows.map((r) => {
    const tokens = parseInt(r.tokens);
    const requests = parseInt(r.requests);
    const cost = r.cost ? parseFloat(r.cost) : undefined;
    const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0;
    return new ModelDistribution(
      r.modelId as unknown as UUID,
      r.modelName || `model-${r.modelId.slice(0, 8)}`,
      r.displayName || `Model ${r.modelId.slice(0, 8)}`,
      r.provider,
      tokens,
      requests,
      cost,
      percentage,
    );
  });
  return { totalTokens, items };
}

export function mapUserModelStatsToBreakdown(
  rows: ModelStatsRow[],
): ModelBreakdownItem[] {
  return rows.map(
    (r) =>
      new ModelBreakdownItem(
        r.modelId,
        r.modelName || `model-${r.modelId.slice(0, 8)}`,
        r.displayName || `Model ${r.modelId.slice(0, 8)}`,
        r.provider,
        parseInt(r.tokens),
        parseInt(r.requests),
        r.cost ? parseFloat(r.cost) : undefined,
        undefined,
      ),
  );
}
export function mapTopModelRows(rows: TopModelRow[]): string[] {
  return rows.map((m) => m.displayName || `model-${m.modelId.slice(0, 8)}`);
}
