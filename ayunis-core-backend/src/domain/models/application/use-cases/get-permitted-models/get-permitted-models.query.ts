import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class GetPermittedModelsQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly filter?: {
      provider?: ModelProvider;
      modelId?: UUID;
    },
  ) {}
}
