import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import {
  SourceNotFoundError,
  SourceNotReadyForReindexError,
  SourceReindexNotSupportedError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { EnqueueSourceReindexCommand } from './enqueue-source-reindex.command';

/**
 * Starts a re-index of a READY URL source with its stored crawl scope. Takes
 * the org and user explicitly instead of from the request context so that
 * background callers can use it; it performs no access check of its own.
 */
@Injectable()
export class EnqueueSourceReindexUseCase {
  private readonly logger = new Logger(EnqueueSourceReindexUseCase.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly urlCrawlProcessingPort: UrlCrawlProcessingPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: EnqueueSourceReindexCommand): Promise<void> {
    this.logger.log(
      { sourceId: command.sourceId },
      'Enqueuing source re-index',
    );

    const source = await this.sourceRepository.findById(command.sourceId);
    if (!source) throw new SourceNotFoundError(command.sourceId);
    // File sources keep no raw file after processing, so only a URL can be
    // fetched again.
    if (!(source instanceof UrlSource)) {
      throw new SourceReindexNotSupportedError(command.sourceId);
    }
    if (source.status !== SourceStatus.READY) {
      throw new SourceNotReadyForReindexError(command.sourceId, source.status);
    }

    await this.urlCrawlProcessingPort.enqueue({
      sourceId: source.id,
      orgId: command.orgId,
      userId: command.userId,
      rootUrl: source.url,
      maxDepth: source.maxDepth,
      kind: SourceIngestionKind.REINDEX,
    });
  }
}
