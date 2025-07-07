import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class IsProviderPermittedQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly provider: ModelProvider,
  ) {}
}
