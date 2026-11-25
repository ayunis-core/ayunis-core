import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { GetModelByIdQuery } from 'src/domain/models/application/use-cases/get-model-by-id/get-model-by-id.query';
import { GetModelByIdUseCase } from 'src/domain/models/application/use-cases/get-model-by-id/get-model-by-id.use-case';
import { ModelNotFoundByIdError } from 'src/domain/models/application/models.errors';
import { EmbedTextCommand } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.command';
import { EmbedTextUseCase } from 'src/domain/rag/embeddings/application/use-cases/embed-text/embed-text.use-case';
import { EmbeddingPriority } from 'src/domain/rag/embeddings/domain/embedding-priority.enum';
import type { Embedding } from 'src/domain/rag/embeddings/domain/embedding.entity';
import { GetOparlEmbeddingModelIdUseCase } from 'src/iam/platform-config/application/use-cases/get-oparl-embedding-model-id/get-oparl-embedding-model-id.use-case';
import { OparlDocumentsRepository } from 'src/domain/oparl/application/ports/oparl-documents.repository';

const BATCH = 64;

type EmbedOutcome = 'done' | 'deadline' | 'failed' | 'changed';

/**
 * Embeds chunks with the installation's OParl embedding model, in the
 * embeddings throttle's lowest lane, charged to no org. A chunk is embedded
 * again whenever its vector is of another model.
 */
@Injectable()
export class OparlChunkEmbedder {
  private readonly logger = new Logger(OparlChunkEmbedder.name);

  constructor(
    private readonly documents: OparlDocumentsRepository,
    private readonly getModelId: GetOparlEmbeddingModelIdUseCase,
    private readonly getModelById: GetModelByIdUseCase,
    private readonly embedText: EmbedTextUseCase,
  ) {}

  /** The chosen model, `null` while none is chosen or it left the catalog or was archived. */
  async currentModel(): Promise<EmbeddingModel | null> {
    const id = await this.getModelId.execute();
    if (!id) return null;
    try {
      const model = await this.getModelById.execute(new GetModelByIdQuery(id));
      return model instanceof EmbeddingModel && !model.isArchived
        ? model
        : null;
    } catch (error) {
      if (error instanceof ModelNotFoundByIdError) return null;
      throw error;
    }
  }

  /**
   * Embeds what the bodies hold without a vector of the current model; a
   * model change (checked before every batch, also after a provider
   * failure) starts over with the new one. `false` when `deadline` came
   * first. A provider failure of the current model ends the pass; later
   * runs go on.
   */
  async embed(
    bodyIds: UUID[],
    deadline: number,
    signal: AbortSignal,
  ): Promise<boolean> {
    for (;;) {
      const model = await this.currentModel();
      if (!model) return true;
      const outcome = await this.embedBodies(bodyIds, model, deadline, signal);
      if (outcome === 'deadline') return false;
      if ((await this.currentModel())?.id === model.id) return true;
    }
  }

  private async embedBodies(
    bodyIds: UUID[],
    model: EmbeddingModel,
    deadline: number,
    signal: AbortSignal,
  ): Promise<EmbedOutcome> {
    for (const bodyId of bodyIds) {
      const outcome = await this.embedBody(bodyId, model, deadline, signal);
      if (outcome !== 'done') return outcome;
    }
    return 'done';
  }

  private async embedBody(
    bodyId: UUID,
    model: EmbeddingModel,
    deadline: number,
    signal: AbortSignal,
  ): Promise<EmbedOutcome> {
    let afterId: UUID | null = null;
    for (;;) {
      signal.throwIfAborted();
      if (Date.now() >= deadline) return 'deadline';
      if ((await this.getModelId.execute()) !== model.id) return 'changed';
      const chunks = await this.documents.findChunksToEmbed(
        bodyId,
        model.id,
        afterId,
        BATCH,
      );
      if (chunks.length === 0) return 'done';
      if (!(await this.embedBatch(model, chunks))) return 'failed';
      afterId = chunks[chunks.length - 1].id;
    }
  }

  private async embedBatch(
    model: EmbeddingModel,
    chunks: Array<{ id: UUID; text: string }>,
  ): Promise<boolean> {
    let embeddings: Embedding[];
    try {
      embeddings = await this.embedText.execute(
        new EmbedTextCommand({
          model,
          texts: chunks.map((chunk) => chunk.text),
          priority: EmbeddingPriority.REINDEXING,
        }),
      );
    } catch (error) {
      if (!(error instanceof ApplicationError)) throw error;
      this.logger.warn(
        { modelId: model.id, err: error },
        'Could not embed OParl chunks',
      );
      return false;
    }
    // A catalog entry whose dimensions differ from what the provider returns
    // would fail every write; it ends the pass instead.
    if (
      embeddings.length !== chunks.length ||
      embeddings.some(
        ({ vector }) => vector.length !== Number(model.dimensions),
      )
    ) {
      this.logger.warn(
        { modelId: model.id, dimensions: model.dimensions },
        'The embeddings do not match the chunks or the model dimensions',
      );
      return false;
    }
    await this.documents.saveEmbeddings(
      model.id,
      model.dimensions,
      chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: embeddings[index].vector,
      })),
    );
    return true;
  }
}
