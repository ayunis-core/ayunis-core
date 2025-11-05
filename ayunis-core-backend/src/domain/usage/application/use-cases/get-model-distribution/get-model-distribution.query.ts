import { UUID } from 'crypto';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

export class GetModelDistributionQuery {
  constructor(
    public readonly organizationId: UUID,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly maxModels: number = UsageConstants.MAX_INDIVIDUAL_MODELS_IN_CHART,
    public readonly modelId?: UUID,
  ) {}
}
