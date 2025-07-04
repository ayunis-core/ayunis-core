import { ModelProvider } from '../../../domain/value-objects/model-provider.enum';

export class GetModelProviderInfoQuery {
  constructor(public readonly provider: ModelProvider) {}
}
