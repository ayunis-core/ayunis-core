import { UUID } from 'crypto';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';

export class CollectUsageCommand {
  constructor(
    public readonly userId: UUID,
    public readonly organizationId: UUID,
    public readonly modelId: UUID,
    public readonly provider: ModelProvider,
    public readonly requestId: UUID,
    public readonly inputTokens: number,
    public readonly outputTokens: number,
    public readonly totalTokens: number,
  ) {}
}
