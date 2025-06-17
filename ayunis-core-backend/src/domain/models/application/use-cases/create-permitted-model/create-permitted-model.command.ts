import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class CreatePermittedModelCommand {
  constructor(
    public readonly modelName: string,
    public readonly modelProvider: ModelProvider,
    public readonly orgId: UUID,
  ) {}
}
