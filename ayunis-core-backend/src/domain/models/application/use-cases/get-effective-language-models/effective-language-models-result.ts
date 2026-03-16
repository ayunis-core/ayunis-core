import type { UUID } from 'crypto';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

export interface EffectiveLanguageModelsResult {
  models: PermittedLanguageModel[];
  overrideTeamIds: UUID[];
}
