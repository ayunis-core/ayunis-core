import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class UpdateEmbeddingModelCommand {
  id: UUID;
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  dimensions: number;

  constructor(params: {
    id: UUID;
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    dimensions: number;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.dimensions = params.dimensions;
  }
}
