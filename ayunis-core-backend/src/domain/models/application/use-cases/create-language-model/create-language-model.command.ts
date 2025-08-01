import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class CreateLanguageModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  canStream: boolean;
  isReasoning: boolean;
  isArchived: boolean;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    canStream: boolean;
    isReasoning: boolean;
    isArchived: boolean;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.canStream = params.canStream;
    this.isReasoning = params.isReasoning;
    this.isArchived = params.isArchived;
  }
}
