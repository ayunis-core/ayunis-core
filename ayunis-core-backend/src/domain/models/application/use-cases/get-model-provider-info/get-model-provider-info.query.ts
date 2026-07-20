import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class GetModelProviderInfoQuery {
  constructor(public readonly provider: ModelProvider) {}
}
