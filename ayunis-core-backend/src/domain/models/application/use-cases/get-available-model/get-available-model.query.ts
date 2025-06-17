import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class GetAvailableModelQuery {
  constructor(
    public readonly modelName: string,
    public readonly modelProvider: ModelProvider,
  ) {}
}
