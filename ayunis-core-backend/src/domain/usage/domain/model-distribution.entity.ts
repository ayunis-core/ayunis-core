import type { UUID } from 'crypto';
import type { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';

export class ModelDistribution {
  public readonly modelId: UUID;
  public readonly modelName: string;
  public readonly displayName: string;
  public readonly provider: ModelProvider;
  public readonly credits: number;
  public readonly requests: number;
  public readonly percentage: number;

  constructor(params: {
    modelId: UUID;
    modelName: string;
    displayName: string;
    provider: ModelProvider;
    credits: number;
    requests: number;
    percentage: number;
  }) {
    this.modelId = params.modelId;
    this.modelName = params.modelName;
    this.displayName = params.displayName;
    this.provider = params.provider;
    this.credits = params.credits;
    this.requests = params.requests;
    this.percentage = params.percentage;
  }
}
