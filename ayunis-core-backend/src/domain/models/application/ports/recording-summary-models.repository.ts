import type { UUID } from 'crypto';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

/** At most one recording summary model per org; every write replaces it. */
export abstract class RecordingSummaryModelsRepository {
  abstract find(orgId: UUID): Promise<PermittedLanguageModel | null>;
  abstract set(orgId: UUID, permittedModelId: UUID): Promise<void>;
  abstract clear(orgId: UUID): Promise<void>;
}
