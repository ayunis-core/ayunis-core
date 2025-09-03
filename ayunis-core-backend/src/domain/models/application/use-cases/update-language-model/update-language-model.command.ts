import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class UpdateLanguageModelCommand {
  id: UUID;
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  canStream: boolean;
  canUseTools: boolean;
  isReasoning: boolean;

  constructor(params: {
    id: UUID;
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    canStream: boolean;
    canUseTools: boolean;
    isReasoning: boolean;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.canStream = params.canStream;
    this.canUseTools = params.canUseTools;
    this.isReasoning = params.isReasoning;
  }
}
