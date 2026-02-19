import type { UUID } from 'crypto';
import type { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

export class GetGlobalProviderUsageQuery {
  public readonly startDate?: Date;
  public readonly endDate?: Date;
  public readonly includeTimeSeriesData: boolean;
  public readonly provider?: ModelProvider;
  public readonly modelId?: UUID;

  constructor(params: {
    startDate?: Date;
    endDate?: Date;
    includeTimeSeriesData?: boolean;
    provider?: ModelProvider;
    modelId?: UUID;
  }) {
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.includeTimeSeriesData = params.includeTimeSeriesData ?? true;
    this.provider = params.provider;
    this.modelId = params.modelId;
  }
}
