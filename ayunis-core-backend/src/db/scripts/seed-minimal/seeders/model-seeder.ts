import { randomUUID } from 'crypto';
import {
  LanguageModelRecord,
  EmbeddingModelRecord,
  ImageGenerationModelRecord,
} from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { LANGUAGE_MODEL_KEYS } from 'src/db/fixtures/minimal.fixture';
import { GlobalSeeder } from './base-seeder';
import { log } from 'src/db/scripts/utils/seed-log';
import type { SeedState } from '../seed-state';
import type { LanguageModelKey } from '../seed-types';

type LanguageModelFixture = SeedState['fixture'][LanguageModelKey];

export class ModelSeeder extends GlobalSeeder {
  async seed(ctx: SeedState): Promise<void> {
    const [languageModels, embeddingModel, imageGenerationModel] =
      await Promise.all([
        this.seedLanguageModels(ctx),
        this.seedEmbeddingModel(ctx),
        this.seedImageGenerationModel(ctx),
      ]);
    ctx.setModels({ ...languageModels, embeddingModel, imageGenerationModel });
  }

  private async seedLanguageModels(
    ctx: SeedState,
  ): Promise<Record<LanguageModelKey, LanguageModelRecord>> {
    const entries = await Promise.all(
      LANGUAGE_MODEL_KEYS.map(
        async (key) =>
          [key, await this.seedLanguageModel(ctx.fixture[key])] as const,
      ),
    );
    return Object.fromEntries(entries) as Record<
      LanguageModelKey,
      LanguageModelRecord
    >;
  }

  private async seedLanguageModel(
    entry: LanguageModelFixture,
  ): Promise<LanguageModelRecord> {
    const { name, displayName, provider, ...capabilities } = entry;
    return this.findOrCreate(
      this.repo(LanguageModelRecord),
      { name, provider },
      () => ({
        id: randomUUID(),
        name,
        displayName,
        provider,
        ...capabilities,
      }),
      { entity: 'Language model', name },
    );
  }

  private async seedEmbeddingModel(
    ctx: SeedState,
  ): Promise<EmbeddingModelRecord> {
    const { name, displayName, provider, dimensions } =
      ctx.fixture.embeddingModel;
    return this.findOrCreate(
      this.repo(EmbeddingModelRecord),
      { name, provider },
      () => ({ id: randomUUID(), name, displayName, provider, dimensions }),
      { entity: 'Embedding model', name },
    );
  }

  private async seedImageGenerationModel(
    ctx: SeedState,
  ): Promise<ImageGenerationModelRecord> {
    const repo = this.repo(ImageGenerationModelRecord);
    const { name, displayName, provider, inputTokenCost, outputTokenCost } =
      ctx.fixture.imageGenerationModel;

    const existing = await repo.findOne({ where: { name, provider } });
    if (existing) {
      const backfilled = await this.backfillPricing(
        existing,
        inputTokenCost,
        outputTokenCost,
      );
      log('Image generation model', existing.name, backfilled);
      return existing;
    }

    const created = await repo.save(
      repo.create({
        id: randomUUID(),
        name,
        displayName,
        provider,
        inputTokenCost,
        outputTokenCost,
      }),
    );
    log('Image generation model', created.name, true);
    return created;
  }

  private async backfillPricing(
    record: ImageGenerationModelRecord,
    inputTokenCost: number,
    outputTokenCost: number,
  ): Promise<boolean> {
    const needsInputCost = record.inputTokenCost === undefined;
    const needsOutputCost = record.outputTokenCost === undefined;
    if (!needsInputCost && !needsOutputCost) return false;

    if (needsInputCost) record.inputTokenCost = inputTokenCost;
    if (needsOutputCost) record.outputTokenCost = outputTokenCost;
    await this.repo(ImageGenerationModelRecord).save(record);
    return true;
  }
}
