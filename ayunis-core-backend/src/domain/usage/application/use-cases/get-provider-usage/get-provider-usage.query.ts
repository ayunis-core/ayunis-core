import { UUID } from 'crypto';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

export class GetProviderUsageQuery {
  public readonly organizationId: UUID;
  public readonly startDate?: Date;
  public readonly endDate?: Date;
  public readonly includeTimeSeriesData: boolean;
  public readonly provider?: ModelProvider;
  public readonly modelId?: UUID;

  constructor(params: {
    organizationId: UUID;
    startDate?: Date;
    endDate?: Date;
    includeTimeSeriesData?: boolean;
    provider?: ModelProvider;
    modelId?: UUID;
  }) {
    this.organizationId = params.organizationId;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.includeTimeSeriesData = params.includeTimeSeriesData ?? true;
    this.provider = params.provider;
    this.modelId = params.modelId;
  }
}
