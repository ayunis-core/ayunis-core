import { Injectable, Logger } from '@nestjs/common';
import type { DueSourceReindex } from 'src/domain/sources/application/models/due-source-reindex';
import {
  SourceNotFoundError,
  SourceNotReadyForReindexError,
} from 'src/domain/sources/application/sources.errors';
import { EnqueueSourceReindexCommand } from 'src/domain/sources/application/use-cases/enqueue-source-reindex/enqueue-source-reindex.command';
import { EnqueueSourceReindexUseCase } from 'src/domain/sources/application/use-cases/enqueue-source-reindex/enqueue-source-reindex.use-case';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import {
  SourceReindexHandler,
  SourceReindexOutcome,
} from './source-reindex-handler';

@Injectable()
export class UrlSourceReindexHandler extends SourceReindexHandler {
  private readonly logger = new Logger(UrlSourceReindexHandler.name);
  readonly subtype = TextType.WEB;

  constructor(
    private readonly enqueueSourceReindexUseCase: EnqueueSourceReindexUseCase,
  ) {
    super();
  }

  async start(due: DueSourceReindex): Promise<SourceReindexOutcome> {
    try {
      await this.enqueueSourceReindexUseCase.execute(
        new EnqueueSourceReindexCommand({
          sourceId: due.sourceId,
          orgId: due.orgId,
        }),
      );
      return SourceReindexOutcome.STARTED;
    } catch (error) {
      if (
        error instanceof SourceNotReadyForReindexError ||
        error instanceof SourceNotFoundError
      ) {
        this.logger.log(
          { sourceId: due.sourceId, reason: error.code },
          'Skipping scheduled re-index',
        );
        return SourceReindexOutcome.SKIPPED;
      }
      throw error;
    }
  }
}
