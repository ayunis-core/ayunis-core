import { UUID } from 'crypto';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

export class GetGlobalModelDistributionQuery {
  public readonly startDate?: Date;
  public readonly endDate?: Date;
  public readonly maxModels: number;
  public readonly modelId?: UUID;

  constructor(params: {
    startDate?: Date;
    endDate?: Date;
    maxModels?: number;
    modelId?: UUID;
  }) {
    this.startDate = params.startDate;
    this.endDate = params.endDate;
    this.maxModels = params.maxModels ?? UsageConstants.MAX_MODELS;
    this.modelId = params.modelId;
  }
}
