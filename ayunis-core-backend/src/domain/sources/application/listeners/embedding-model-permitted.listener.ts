import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmbeddingModelPermittedEvent } from 'src/domain/models/application/events/embedding-model-permitted.event';
import { SourceReindexProcessingPort } from 'src/domain/sources/application/ports/source-reindex-processing.port';
import { FlagStaleSourcesCommand } from 'src/domain/sources/application/use-cases/flag-stale-sources/flag-stale-sources.command';
import { FlagStaleSourcesUseCase } from 'src/domain/sources/application/use-cases/flag-stale-sources/flag-stale-sources.use-case';

/** Re-indexes an org's sources once it is permitted an embedding model. */
@Injectable()
export class EmbeddingModelPermittedListener {
  constructor(
    private readonly flagStaleSources: FlagStaleSourcesUseCase,
    private readonly reindexQueue: SourceReindexProcessingPort,
  ) {}

  // Unsuppressed: when the sources cannot be flagged, the permit is rolled
  // back instead of leaving them unsearchable. A job reads the flagged rows,
  // so it is queued only after the permit committed; if queueing fails, the
  // stale-reindexing sweep queues the sources later.
  @OnEvent(EmbeddingModelPermittedEvent.EVENT_NAME, { suppressErrors: false })
  async handle(event: EmbeddingModelPermittedEvent): Promise<void> {
    const sourceIds = await this.flagStaleSources.execute(
      new FlagStaleSourcesCommand(event.orgId, event.embeddingModelId),
    );
    event.afterCommit(() => this.reindexQueue.enqueue(event.orgId, sourceIds));
  }
}
