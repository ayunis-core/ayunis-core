import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

export class CreateEmbeddingModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  dimensions: EmbeddingDimensions;
  inputTokenCost?: number;
  outputTokenCost?: number;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    dimensions: EmbeddingDimensions;
    inputTokenCost?: number;
    outputTokenCost?: number;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.dimensions = params.dimensions;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
  }
}
