import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { Currency } from 'src/domain/models/domain/value-objects/currency.enum';

export class CreateEmbeddingModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  dimensions: EmbeddingDimensions;
  inputTokenCost?: number;
  outputTokenCost?: number;
  currency?: Currency;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    dimensions: EmbeddingDimensions;
    inputTokenCost?: number;
    outputTokenCost?: number;
    currency?: Currency;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.dimensions = params.dimensions;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
    this.currency = params.currency;
  }
}
