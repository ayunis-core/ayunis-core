import type {
  LanguageModelRecord,
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
} from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import type { LANGUAGE_MODEL_KEYS } from 'src/db/fixtures/minimal.fixture';
import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export type {
  OrgFixture,
  AdminFixture,
  MemberFixture,
  SubscriptionFixture,
} from 'src/db/fixtures/minimal-fixture.types';

export type LanguageModelKey = (typeof LANGUAGE_MODEL_KEYS)[number];

export type SeededModels = Record<LanguageModelKey, LanguageModelRecord> & {
  embeddingModel: EmbeddingModelRecord;
  imageGenerationModel: ImageGenerationModelRecord;
};

export interface UsageSeedModel {
  id: string;
  provider: ModelProvider;
  inputTokenCost?: number | null;
  outputTokenCost?: number | null;
}
