import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class CreateModelCommand {
  constructor(
    public readonly name: string,
    public readonly provider: ModelProvider,
    public readonly displayName: string,
    public readonly canStream: boolean,
    public readonly isReasoning: boolean,
    public readonly isArchived: boolean,
  ) {}
}
