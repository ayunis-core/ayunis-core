import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { CleanupSourceProcessingCommand } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.command';
import { CleanupSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/cleanup-source-processing/cleanup-source-processing.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { SwapInReplacementSourceCommand } from 'src/domain/sources/application/use-cases/swap-in-replacement-source/swap-in-replacement-source.command';
import { SwapInReplacementSourceUseCase } from 'src/domain/sources/application/use-cases/swap-in-replacement-source/swap-in-replacement-source.use-case';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SyncedLocationLocks } from './synced-location-locks.service';

/**
 * Changes a synced file's document once the processing of one of its
 * versions is done, each under the locks a sync takes, so neither a sync
 * nor a removal of the location sees half of it.
 */
@Injectable()
export class SyncedFileDocuments {
  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly locks: SyncedLocationLocks,
    private readonly swapIn: SwapInReplacementSourceUseCase,
    private readonly deleteSources: DeleteSourcesUseCase,
    private readonly cleanupProcessing: CleanupSourceProcessingUseCase,
    private readonly getSources: GetSourcesByIdsUseCase,
    private readonly markFailed: MarkSourceFailedUseCase,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  /**
   * Settles the job's version with its settled replacement: it takes the
   * document's place, unless it failed while the document holds an indexed
   * version, which then stays. Either way the file records the version as
   * processed, and the failure if any. A replacement for a version that is
   * no longer the file's is discarded. True when it took the place.
   */
  async settle(job: SyncedFileJobData, replacement: Source): Promise<boolean> {
    const replaced = await this.txHost.withTransaction(async () => {
      const file = await this.lockedFile(job, [replacement.id]);
      if (file?.sourceId !== job.sourceId || file.version !== job.version) {
        await this.discard(job.orgId, replacement.id);
        return null;
      }
      return this.swap(job, file, replacement);
    });
    if (replaced?.storageKey)
      await this.cleanupProcessing.execute(
        new CleanupSourceProcessingCommand([], job.orgId, [
          replaced.storageKey,
        ]),
      );
    return replaced !== null;
  }

  /**
   * Settles the job's version as failed before a replacement could be
   * processed: a document that never held a version shows the failure, an
   * indexed one stays.
   */
  async fail(
    job: SyncedFileJobData,
    failure: SourceProcessingErrorCode,
    message: string,
  ): Promise<void> {
    await this.txHost.withTransaction(async () => {
      const file = await this.lockedFile(job);
      if (file?.sourceId !== job.sourceId || file.version !== job.version)
        return;
      const document = (
        await this.getSources.execute(new GetSourcesByIdsQuery([job.sourceId]))
      ).at(0);
      if (document?.status === SourceStatus.PROCESSING)
        await this.markFailed.execute(
          new MarkSourceFailedCommand({
            sourceId: job.sourceId,
            errorMessage: message,
            errorCode: failure,
          }),
        );
      file.recordProcessed(job.version, failure);
      await this.repository.saveFiles([file]);
    });
  }

  /** Removes a file that no longer exists, with its document. */
  async remove(job: SyncedFileJobData): Promise<void> {
    await this.txHost.withTransaction(async () => {
      const file = await this.lockedFile(job);
      if (!file) return;
      if (file.sourceId)
        await this.deleteSources.execute(
          new DeleteSourcesCommand([file.sourceId], job.orgId),
        );
      await this.repository.deleteFiles([file.id]);
    });
  }

  private async swap(
    job: SyncedFileJobData,
    file: SyncedFile,
    replacement: Source,
  ): Promise<{ storageKey: string | null } | null> {
    const failure =
      replacement.status === SourceStatus.FAILED
        ? (replacement.processingErrorCode ??
          SourceProcessingErrorCode.PROCESSING_FAILED)
        : null;
    const replaced = await this.swapIn.execute(
      new SwapInReplacementSourceCommand(replacement.id, job.orgId, file.name),
    );
    if (replaced) {
      file.replaceDocument(replacement.id, job.version, failure);
    } else if (failure) {
      await this.discard(job.orgId, replacement.id);
      file.recordProcessed(job.version, failure);
    } else {
      return null;
    }
    await this.repository.saveFiles([file]);
    return replaced;
  }

  private async lockedFile(
    job: SyncedFileJobData,
    alsoSources: UUID[] = [],
  ): Promise<SyncedFile | null> {
    const location = await this.repository.findById(job.locationId);
    if (!location) return null;
    const locked = await this.locks.lockFile(
      location,
      job.syncedFileId,
      alsoSources,
    );
    return locked?.file ?? null;
  }

  private discard(orgId: UUID, replacementId: UUID): Promise<void> {
    return this.deleteSources.execute(
      new DeleteSourcesCommand([replacementId], orgId),
    );
  }
}
