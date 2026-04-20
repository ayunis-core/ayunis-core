import type { UUID } from 'crypto';
import type { ImageGenerationModel } from '../../../../models/domain/models/image-generation.model';
import type { LanguageModel } from '../../../../models/domain/models/language.model';

export type CollectableUsageModel = LanguageModel | ImageGenerationModel;

export class CollectUsageCommand {
  public readonly model: CollectableUsageModel;
  public readonly inputTokens: number;
  public readonly outputTokens: number;
  public readonly requestId?: UUID;

  constructor(params: {
    model: CollectableUsageModel;
    inputTokens: number;
    outputTokens: number;
    requestId?: UUID;
  }) {
    this.model = params.model;
    this.inputTokens = params.inputTokens;
    this.outputTokens = params.outputTokens;
    this.requestId = params.requestId;
  }

  get totalTokens(): number {
    return this.inputTokens + this.outputTokens;
  }

  get modelId(): UUID {
    return this.model.id;
  }

  get provider() {
    return this.model.provider;
  }
}
