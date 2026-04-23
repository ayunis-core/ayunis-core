import type { UUID } from 'crypto';
import type { LanguageModel } from '../../domain/models/language.model';

// User defaults reference catalog LanguageModels (not org-scoped permitted_models)
// so a user's preference survives admins removing/re-adding a permitted model.
// Resolution to a concrete PermittedLanguageModel happens at the use-case layer.
export abstract class UserDefaultModelsRepository {
  abstract findByUserId(userId: UUID): Promise<LanguageModel | null>;
  abstract setAsDefault(
    model: LanguageModel,
    userId: UUID,
  ): Promise<LanguageModel>;
  abstract deleteByUserId(userId: UUID): Promise<void>;
}
