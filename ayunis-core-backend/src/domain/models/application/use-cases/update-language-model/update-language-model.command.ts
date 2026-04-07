import type { UUID } from 'crypto';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';

export class UpdateLanguageModelCommand {
  id: UUID;
  name: string;
  provider: ModelProvider;
  displayName: string;
  isArchived: boolean;
  canStream: boolean;
  canUseTools: boolean;
  isReasoning: boolean;
  canVision: boolean;
  inputTokenCost?: number;
  outputTokenCost?: number;
  tier?: ModelTier;

  constructor(params: {
    id: UUID;
    name: string;
    provider: ModelProvider;
    displayName: string;
    isArchived: boolean;
    canStream: boolean;
    canUseTools: boolean;
    isReasoning: boolean;
    canVision: boolean;
    inputTokenCost?: number;
    outputTokenCost?: number;
    tier?: ModelTier;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.isArchived = params.isArchived;
    this.canStream = params.canStream;
    this.canUseTools = params.canUseTools;
    this.isReasoning = params.isReasoning;
    this.canVision = params.canVision;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
    this.tier = params.tier;
  }
}
