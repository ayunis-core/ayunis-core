import { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';
import { TimeSeriesPoint } from './time-series-point.entity';

export class ProviderUsage {
  public readonly provider: ModelProvider;
  public readonly tokens: number;
  public readonly requests: number;
  public readonly cost: number | undefined;
  public readonly percentage: number;
  public readonly timeSeriesData: TimeSeriesPoint[];

  constructor(params: {
    provider: ModelProvider;
    tokens: number;
    requests: number;
    cost?: number;
    percentage: number;
    timeSeriesData: TimeSeriesPoint[];
  }) {
    this.provider = params.provider;
    this.tokens = params.tokens;
    this.requests = params.requests;
    this.cost = params.cost;
    this.percentage = params.percentage;
    this.timeSeriesData = params.timeSeriesData;
  }
}

export { TimeSeriesPoint };
