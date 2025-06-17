import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class GetPermittedModelQuery {
  constructor(public readonly orgId: UUID) {}
}

export class GetPermittedModelByIdQuery extends GetPermittedModelQuery {
  modelId: UUID;
  constructor(params: { modelId: UUID; orgId: UUID }) {
    super(params.orgId);
    this.modelId = params.modelId;
  }
}

export class GetPermittedModelByNameAndProviderQuery extends GetPermittedModelQuery {
  name: string;
  provider: ModelProvider;

  constructor(params: { name: string; provider: ModelProvider; orgId: UUID }) {
    super(params.orgId);
    this.name = params.name;
    this.provider = params.provider;
  }
}
