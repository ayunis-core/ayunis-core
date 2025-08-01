import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class GetModelQuery {
  constructor(
    public readonly name: string,
    public readonly provider: ModelProvider,
  ) {}
}
