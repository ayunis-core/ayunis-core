import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DocumentProcessingPort } from 'src/domain/sources/application/ports/document-processing.port';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';
import { PurgeStoragePrefixesCommand } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.command';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';
import { CleanupSourceProcessingCommand } from './cleanup-source-processing.command';

/**
 * Cancels in-flight processing jobs, purges legacy processing blobs
 * (`<orgId>/processing/<sourceId>/`) and releases the uploaded originals of
 * the given sources once nothing references them.
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
    private readonly purgeStoragePrefixesUseCase: PurgeStoragePrefixesUseCase,
    private readonly sourceRepository: SourceRepository,
    private readonly uploadStorageCleanup: SourceUploadStorageCleanupService,
  ) {}

  async execute(command: CleanupSourceProcessingCommand): Promise<void> {
    await this.releaseStorageKeys(command.storageKeys);
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
    if (command.orgId === null) return;

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

  // Table uploads share one original across their sheet sources, so a key is
  // released only after the last source pointing at it is gone.
  private async releaseStorageKeys(storageKeys: string[]): Promise<void> {
    const keys = [...new Set(storageKeys)];
    if (keys.length === 0) return;
    let referenced: Set<string>;
    try {
      referenced = new Set(
        await this.sourceRepository.findReferencedStorageKeys(keys),
      );
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'Could not resolve referenced storage keys; keeping originals',
      );
      return;
    }
    for (const key of keys) {
      if (!referenced.has(key)) await this.uploadStorageCleanup.remove(key);
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
