import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class GetAllPermittedProvidersQuery {
  constructor(public readonly orgId: UUID) {}
}
