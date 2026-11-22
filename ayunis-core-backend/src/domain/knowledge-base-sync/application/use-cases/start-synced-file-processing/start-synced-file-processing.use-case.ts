import { Injectable, Logger } from '@nestjs/common';
import { createHash, type UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  detectFileType,
  getCanonicalMimeType,
} from 'src/common/util/file-type';
import { UnexpectedKnowledgeBaseSyncError } from 'src/domain/knowledge-base-sync/application/knowledge-base-sync.errors';
import {
  SyncSourceOutcome,
  type SyncItemContent,
} from 'src/domain/knowledge-base-sync/application/models/sync-source-results';
import type { SyncedFileJobData } from 'src/domain/knowledge-base-sync/application/ports/synced-file-jobs.port';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import { EnabledSyncProviders } from 'src/domain/knowledge-base-sync/application/services/enabled-sync-providers.service';
import { SyncedFileDocuments } from 'src/domain/knowledge-base-sync/application/services/synced-file-documents.service';
import { SyncSources } from 'src/domain/knowledge-base-sync/application/services/sync-sources.service';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { throttlePauseEnd } from 'src/domain/knowledge-base-sync/domain/sync-schedule';
import { PauseSourceProcessingCommand } from 'src/domain/sources/application/use-cases/pause-source-processing/pause-source-processing.command';
import { PauseSourceProcessingUseCase } from 'src/domain/sources/application/use-cases/pause-source-processing/pause-source-processing.use-case';
import { CreateReplacementSourceCommand } from 'src/domain/sources/application/use-cases/create-replacement-source/create-replacement-source.command';
import { CreateReplacementSourceUseCase } from 'src/domain/sources/application/use-cases/create-replacement-source/create-replacement-source.use-case';
import { GetSourcesByIdsQuery } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.query';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { buildSyncedOriginalKey } from 'src/domain/sources/domain/upload/source-upload.constants';
import { GetObjectInfoCommand } from 'src/domain/storage/application/use-cases/get-object-info/get-object-info.command';
import { GetObjectInfoUseCase } from 'src/domain/storage/application/use-cases/get-object-info/get-object-info.use-case';
import { UploadOrgObjectCommand } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.command';
import { UploadOrgObjectUseCase } from 'src/domain/storage/application/use-cases/upload-org-object/upload-org-object.use-case';
import { StartSyncedFileProcessingCommand } from './start-synced-file-processing.command';
import {
  StartSyncedFileProcessingOutcome,
  type StartSyncedFileProcessingResult,
} from './start-synced-file-processing.result';

/**
 * Prepares a queued version of a synced file for the document pipeline: its
 * content is read through the location's source and stored as the original
 * of a new hidden replacement of the file's document, which the pipeline then
 * processes. Waits while the location is paused, and pauses it while the
 * source system throttles. The document stays as it is until the replacement is settled
 * (`CompleteSyncedFileProcessingUseCase`). Runs without a user.
 */
@Injectable()
export class StartSyncedFileProcessingUseCase {
  private readonly logger = new Logger(StartSyncedFileProcessingUseCase.name);

  constructor(
    private readonly repository: SyncedLocationsRepository,
    private readonly sources: SyncSources,
    private readonly uploadObject: UploadOrgObjectUseCase,
    private readonly createReplacement: CreateReplacementSourceUseCase,
    private readonly getSources: GetSourcesByIdsUseCase,
    private readonly getObjectInfo: GetObjectInfoUseCase,
    private readonly documents: SyncedFileDocuments,
    private readonly pauseSourceProcessing: PauseSourceProcessingUseCase,
    private readonly providers: EnabledSyncProviders,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseSyncError)
  async execute(
    command: StartSyncedFileProcessingCommand,
  ): Promise<StartSyncedFileProcessingResult> {
    const { job } = command;
    this.logger.log(
      { syncedFileId: job.syncedFileId, sourceId: job.sourceId },
      'execute',
    );
    const current = await this.currentFile(job);
    if (!current) return { outcome: StartSyncedFileProcessingOutcome.SKIPPED };
    if (!this.providers.includes(current.location.provider))
      return { outcome: StartSyncedFileProcessingOutcome.DISABLED };
    const pausedUntil = current.location.pausedAt(new Date());
    if (pausedUntil) {
      // A replacement an earlier attempt left processing waits too; the
      // stale-processing cleanup would otherwise fail it during a long pause.
      await this.pauseSourceProcessing.execute(
        new PauseSourceProcessingCommand(replacementIdOf(job)),
      );
      return {
        outcome: StartSyncedFileProcessingOutcome.PAUSED,
        retryAt: pausedUntil,
      };
    }
    return (
      (await this.resumeReplacement(job, current.file)) ??
      this.readReplacement(job, current.file, current.location)
    );
  }

  /** The file and its location, while the job is for its current version. */
  private async currentFile(
    job: SyncedFileJobData,
  ): Promise<{ file: SyncedFile; location: SyncedLocation } | null> {
    const file = await this.repository.findFileById(job.syncedFileId);
    if (
      file?.state !== SyncedFileState.IMPORTED ||
      file.sourceId !== job.sourceId ||
      file.version !== job.version ||
      file.documentVersion === job.version
    )
      return null;
    const location = await this.repository.findById(job.locationId);
    return location ? { file, location } : null;
  }

  /**
   * A retry goes on with the replacement an earlier attempt stored, so the
   * pipeline resumes from its saved results instead of reading the file
   * again; a settled one is only settled. A replacement the stale cleanup
   * failed (`PROCESSING_TIMEOUT`) failed for a dead worker, not for the file:
   * the file is read again, and the new replacement drops it.
   */
  private async resumeReplacement(
    job: SyncedFileJobData,
    file: SyncedFile,
  ): Promise<StartSyncedFileProcessingResult | null> {
    const replacement = (
      await this.getSources.execute(
        new GetSourcesByIdsQuery([replacementIdOf(job)]),
      )
    ).at(0);
    if (!replacement?.storageKey || timedOut(replacement)) return null;
    const stored = await this.getObjectInfo.execute(
      new GetObjectInfoCommand(replacement.storageKey),
    );
    return this.process(job, file, replacement.storageKey, stored);
  }

  private async readReplacement(
    job: SyncedFileJobData,
    file: SyncedFile,
    location: SyncedLocation,
  ): Promise<StartSyncedFileProcessingResult> {
    const content = await this.sources.fetchItemContent(
      location,
      file.externalId,
    );
    switch (content.outcome) {
      case SyncSourceOutcome.ACCESS_LOST:
        await this.repository.markNoLongerAccessible(
          location.id,
          location.lastSyncedAt,
        );
        return { outcome: StartSyncedFileProcessingOutcome.ACCESS_LOST };
      case SyncSourceOutcome.THROTTLED: {
        const retryAt = throttlePauseEnd(content.retryAt, new Date());
        await this.repository.pause(location.id, retryAt);
        return { outcome: StartSyncedFileProcessingOutcome.THROTTLED, retryAt };
      }
      case SyncSourceOutcome.GONE:
        await this.documents.remove(job);
        return { outcome: StartSyncedFileProcessingOutcome.GONE };
      case SyncSourceOutcome.UNPROCESSABLE:
        await this.documents.skip(job, content.reason);
        return { outcome: StartSyncedFileProcessingOutcome.UNPROCESSABLE };
      case SyncSourceOutcome.CONTENT:
        return this.storeReplacement(job, file, content);
    }
  }

  // Every job processes its own replacement, never the document itself, so
  // two versions of a file processed at once cannot write the same source.
  private async storeReplacement(
    job: SyncedFileJobData,
    file: SyncedFile,
    content: SyncItemContent,
  ): Promise<StartSyncedFileProcessingResult> {
    const replacementId = replacementIdOf(job);
    const storageKey = buildSyncedOriginalKey(
      job.orgId,
      replacementId,
      file.name,
    );
    const stored = await this.uploadObject
      .execute(
        new UploadOrgObjectCommand(
          job.orgId,
          storageKey,
          // Storage cannot stream an empty body.
          content.size === 0 ? Buffer.alloc(0) : content.content,
        ),
      )
      // Releases the provider's connection when the upload did not read it
      // to the end.
      .finally(() => content.content.destroy());
    // Without a replacement, the stored original is unreferenced and left to
    // the unreferenced-originals sweep.
    const replacement = await this.createReplacement.execute(
      new CreateReplacementSourceCommand({
        id: replacementId,
        replacedSourceId: job.sourceId,
        orgId: job.orgId,
        name: file.name,
        storageKey,
      }),
    );
    if (!replacement)
      return { outcome: StartSyncedFileProcessingOutcome.SKIPPED };
    return this.process(job, file, storageKey, stored);
  }

  private process(
    job: SyncedFileJobData,
    file: SyncedFile,
    storageKey: string,
    stored: { size: number; etag: string },
  ): StartSyncedFileProcessingResult {
    return {
      outcome: StartSyncedFileProcessingOutcome.PROCESS,
      document: {
        sourceId: replacementIdOf(job),
        orgId: job.orgId,
        minioPath: storageKey,
        fileName: file.name,
        fileType: getCanonicalMimeType(detectFileType('', file.name)) ?? '',
        retainFile: true,
        expectedSize: stored.size,
        expectedETag: stored.etag,
      },
    };
  }
}

/** The same for every attempt of a job: one document and version. */
function replacementIdOf(job: SyncedFileJobData): UUID {
  const hex = createHash('sha256')
    .update(`${job.sourceId}\n${job.version}`)
    .digest('hex');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function timedOut(source: Source): boolean {
  return (
    source.status === SourceStatus.FAILED &&
    source.processingErrorCode === SourceProcessingErrorCode.PROCESSING_TIMEOUT
  );
}
