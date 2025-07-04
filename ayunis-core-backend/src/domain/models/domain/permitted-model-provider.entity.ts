import { UUID } from 'crypto';
import { ModelProvider } from './value-objects/model-provider.enum';

export class PermittedProvider {
  public provider: ModelProvider;
  public orgId: UUID;

  constructor(params: { provider: ModelProvider; orgId: UUID }) {
    this.provider = params.provider;
    this.orgId = params.orgId;
  }
}
