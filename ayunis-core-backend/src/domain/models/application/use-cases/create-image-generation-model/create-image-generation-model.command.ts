import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class CreateImageGenerationModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
  }
}
