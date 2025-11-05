import { UUID } from 'crypto';
import { ModelProvider } from '../../models/domain/value-objects/model-provider.enum';

export class ModelDistribution {
  constructor(
    public readonly modelId: UUID,
    public readonly modelName: string,
    public readonly displayName: string,
    public readonly provider: ModelProvider,
    public readonly tokens: number,
    public readonly requests: number,
    public readonly cost: number | undefined,
    public readonly percentage: number,
  ) {}
}
