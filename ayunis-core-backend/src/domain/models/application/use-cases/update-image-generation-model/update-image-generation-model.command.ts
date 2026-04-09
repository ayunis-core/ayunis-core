import type { UUID } from 'crypto';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class UpdateImageGenerationModelCommand {
  id: UUID;
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;

  constructor(params: {
    id: UUID;
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
  }
}
