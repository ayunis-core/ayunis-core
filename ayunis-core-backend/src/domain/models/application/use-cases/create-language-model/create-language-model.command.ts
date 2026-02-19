import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { Currency } from 'src/domain/models/domain/value-objects/currency.enum';

export class CreateLanguageModelCommand {
  name: string;
  provider: ModelProvider;
  displayName: string;
  canStream: boolean;
  canUseTools: boolean;
  isReasoning: boolean;
  canVision: boolean;
  isArchived: boolean;
  inputTokenCost?: number;
  outputTokenCost?: number;
  currency?: Currency;

  constructor(params: {
    name: string;
    provider: ModelProvider;
    displayName: string;
    canStream: boolean;
    canUseTools: boolean;
    isReasoning: boolean;
    canVision: boolean;
    isArchived: boolean;
    inputTokenCost?: number;
    outputTokenCost?: number;
    currency?: Currency;
  }) {
    this.name = params.name;
    this.provider = params.provider;
    this.displayName = params.displayName;
    this.canStream = params.canStream;
    this.canUseTools = params.canUseTools;
    this.isReasoning = params.isReasoning;
    this.canVision = params.canVision;
    this.isArchived = params.isArchived;
    this.inputTokenCost = params.inputTokenCost;
    this.outputTokenCost = params.outputTokenCost;
    this.currency = params.currency;
  }
}
