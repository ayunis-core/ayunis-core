import { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';
import { TimeSeriesPoint } from './time-series-point.entity';

export class ProviderUsage {
  constructor(
    public readonly provider: ModelProvider,
    public readonly tokens: number,
    public readonly requests: number,
    public readonly cost: number | undefined,
    public readonly percentage: number,
    public readonly timeSeriesData: TimeSeriesPoint[],
  ) {}
}

export { TimeSeriesPoint };
