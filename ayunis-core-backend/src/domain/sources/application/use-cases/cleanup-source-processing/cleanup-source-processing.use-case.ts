import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DocumentExtractionPort } from 'src/domain/sources/application/ports/document-extraction.port';
import { DocumentProcessingPort } from 'src/domain/sources/application/ports/document-processing.port';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { CleanupSourceProcessingCommand } from './cleanup-source-processing.command';

/**
 * Cancels in-flight processing jobs and purges processing blobs
 * (`<orgId>/processing/<sourceId>/`) for the given sources.
 *
 * This needs neither source rows nor a request context — the org id is passed
 * explicitly — so it can run during direct deletion or after owning rows are
 * already cascade-deleted. Everything is best-effort: failures are logged,
 * never thrown.
 */
@Injectable()
export class CleanupSourceProcessingUseCase {
  private readonly logger = new Logger(CleanupSourceProcessingUseCase.name);

  constructor(
    private readonly documentProcessingPort: DocumentProcessingPort,
    private readonly urlCrawlProcessingPort: UrlCrawlProcessingPort,
    private readonly documentExtractionPort: DocumentExtractionPort,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
  ) {}

  async execute(command: CleanupSourceProcessingCommand): Promise<void> {
    if (command.sourceIds.length === 0) {
      return;
    }
    this.logger.log(
      {
        orgId: command.orgId,
        sourceCount: command.sourceIds.length,
      },
      'Cleaning up source processing',
    );

    for (const sourceId of command.sourceIds) {
      await this.cancelJobs(sourceId);
    }
    // Before the purge: the service deletes what it wrote and stops writing.
    await this.releaseExtractionJobs(command);

    try {
      await this.purgeStoragePrefixesUseCase.execute(
        new PurgeStoragePrefixesCommand(
          command.sourceIds.map(
            (sourceId) => `${command.orgId}/processing/${sourceId}/`,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(
        { err: error as Error, orgId: command.orgId },
        'Failed to purge source processing storage',
      );
    }
  }

  private async releaseExtractionJobs(
    command: CleanupSourceProcessingCommand,
  ): Promise<void> {
    try {
      await this.documentExtractionPort.releaseOwner({
        orgId: command.orgId,
        sourceIds: command.sourceIds,
      });
    } catch (err) {
      this.logger.warn(
        { orgId: command.orgId, err: err as Error },
        'Failed to release extraction jobs',
      );
    }
  }

  private async cancelJobs(sourceId: UUID): Promise<void> {
    // The caller only knows source ids, not their type, so both pipelines are
    // cancelled best-effort — cancelling the wrong pipeline is a no-op.
    try {
      await this.documentProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn(
        {
          sourceId,
          err: err as Error,
        },
        'Failed to cancel document processing job',
      );
    }
    try {
      await this.urlCrawlProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn(
        {
          sourceId,
          err: err as Error,
        },
        'Failed to cancel URL crawl job',
      );
    }
  }
}
