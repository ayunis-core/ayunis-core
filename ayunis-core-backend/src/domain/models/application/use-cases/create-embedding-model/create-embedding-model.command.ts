import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

export class CreateEmbeddingModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  dimensions: EmbeddingDimensions;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    dimensions: EmbeddingDimensions;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.dimensions = params.dimensions;
  }
}
