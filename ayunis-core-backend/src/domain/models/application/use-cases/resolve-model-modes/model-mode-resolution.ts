import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';

export interface ModelModeResolution {
  mode: ModelMode;
  /** Model bound to a new chat with anonymous mode off; null = mode unusable. */
  permittedModel: PermittedLanguageModel | null;
  /** Same, with anonymous mode on (anonymous-only grants qualify). */
  anonymousPermittedModel: PermittedLanguageModel | null;
}
