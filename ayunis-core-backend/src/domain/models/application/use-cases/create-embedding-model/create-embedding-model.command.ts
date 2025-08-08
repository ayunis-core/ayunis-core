import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class CreateEmbeddingModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  dimensions?: number;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    dimensions?: number;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.dimensions = params.dimensions;
  }
}
