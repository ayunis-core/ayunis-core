import { UUID } from 'crypto';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

export class GetModelDistributionQuery {
  public readonly organizationId: UUID;
  public readonly startDate?: Date;
  public readonly endDate?: Date;
  public readonly maxModels: number;
  public readonly modelId?: UUID;

  constructor(params: {
    organizationId: UUID;
    startDate?: Date;
    endDate?: Date;
    maxModels?: number;
    modelId?: UUID;
  }) {
    this.organizationId = params.organizationId;
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.maxModels = params.maxModels ?? UsageConstants.MAX_MODELS;
    this.modelId = params.modelId;
  }
}
