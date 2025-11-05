import { UUID } from 'crypto';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

export class GetProviderUsageQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly includeTimeSeriesData: boolean = true,
    public readonly provider?: ModelProvider,
    public readonly modelId?: UUID,
  ) {}
}
