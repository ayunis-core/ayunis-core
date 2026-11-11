import type { UUID } from 'crypto';
import type { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export type CollectableUsageModel = LanguageModel | ImageGenerationModel;

export class CollectUsageCommand {
  public readonly model: CollectableUsageModel;
  public readonly inputTokens: number;
  public readonly outputTokens: number;
  public readonly requestId?: UUID;
  /** `null` when the user picked the model; omitted when no chat model was selected. */
  public readonly mode?: ModelMode | null;

  constructor(params: {
    model: CollectableUsageModel;
    inputTokens: number;
    outputTokens: number;
    requestId?: UUID;
    mode?: ModelMode | null;
  }) {
    this.model = params.model;
    this.inputTokens = params.inputTokens;
    this.outputTokens = params.outputTokens;
    this.requestId = params.requestId;
    this.mode = params.mode;
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
