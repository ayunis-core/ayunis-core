import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { UrlCrawlProcessingPort } from '../../ports/url-crawl-processing.port';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { CleanupSourceProcessingCommand } from './cleanup-source-processing.command';

/**
 * Cancels in-flight processing jobs and purges processing blobs
 * (`<orgId>/processing/<sourceId>/`) for the given sources.
 *
 * Unlike `SourceProcessingCleanupService` this needs neither source rows nor a
 * request context — the org id is passed explicitly — so it can run after the
 * owning rows are already cascade-deleted (deferred user/org deletion
 * cleanup). Everything is best-effort: failures are logged, never thrown.
 */
@Injectable()
export class CleanupSourceProcessingUseCase {
  private readonly logger = new Logger(CleanupSourceProcessingUseCase.name);

  constructor(
    private readonly documentProcessingPort: DocumentProcessingPort,
    private readonly urlCrawlProcessingPort: UrlCrawlProcessingPort,
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
  ) {}

  async execute(command: CleanupSourceProcessingCommand): Promise<void> {
    if (command.sourceIds.length === 0) {
      return;
    }
    this.logger.log('Cleaning up source processing', {
      orgId: command.orgId,
      sourceCount: command.sourceIds.length,
    });

    for (const sourceId of command.sourceIds) {
      await this.cancelJobs(sourceId);
    }

    try {
      await this.purgeStoragePrefixesUseCase.execute(
        new PurgeStoragePrefixesCommand(
          command.sourceIds.map(
            (sourceId) => `${command.orgId}/processing/${sourceId}/`,
          ),
        ),
      );
    } catch (error) {
      this.logger.warn('Failed to purge source processing storage', {
        orgId: command.orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async cancelJobs(sourceId: UUID): Promise<void> {
    // The caller only knows source ids, not their type, so both pipelines are
    // cancelled best-effort — cancelling the wrong pipeline is a no-op.
    try {
      await this.documentProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn('Failed to cancel document processing job', {
        sourceId,
        error: err as Error,
      });
    }
    try {
      await this.urlCrawlProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn('Failed to cancel URL crawl job', {
        sourceId,
        error: err as Error,
      });
    }
  }
}
