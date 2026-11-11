import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { detectFileType, isCSVFile } from 'src/common/util/file-type';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SpreadsheetParserPort } from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import { SourceUploadQueueingService } from 'src/domain/sources/application/services/source-upload-queueing.service';
import { SourceUploadSessionAccessService } from 'src/domain/sources/application/services/source-upload-session-access.service';
import { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';
import {
  SourceUploadExpiredError,
  SourceUploadIncompleteError,
  SourceUploadTargetMismatchError,
  UnexpectedSourceError,
  StoredFileMismatchError,
} from 'src/domain/sources/application/sources.errors';
import { CreateProcessingSourceUseCase } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.use-case';
import { CreateProcessingSourceCommand } from 'src/domain/sources/application/use-cases/create-processing-source/create-processing-source.command';
import {
  type DataSourcePlan,
  resolveDataSourcePlans,
} from 'src/domain/sources/application/util/data-source-plans.helper';
import { recordSourceUploadOutcome } from 'src/domain/sources/application/util/source-upload-telemetry.helper';
import { downloadMinioFile } from 'src/domain/sources/application/util/minio-processing-file.helpers';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadPipeline } from 'src/domain/sources/domain/upload/source-upload-pipeline.enum';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import type { UploadedSourceReference } from 'src/domain/sources/domain/upload/uploaded-source-reference';
import {
  ObjectChangedError,
  ObjectNotFoundError,
} from 'src/domain/storage/application/storage.errors';
import { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import { GetObjectInfoUseCase } from 'src/domain/storage/application/use-cases/get-object-info/get-object-info.use-case';
import { GetObjectInfoCommand } from 'src/domain/storage/application/use-cases/get-object-info/get-object-info.command';
import { CompleteSourceUploadCommand } from './complete-source-upload.command';

export interface CompletedSourceUpload {
  sources: Source[];
  /** True when an earlier call already created and queued these sources. */
  alreadyCompleted: boolean;
}

interface PlannedSource extends DataSourcePlan {
  sourceId: UUID;
}

/**
 * Turns a transferred upload into PROCESSING sources and queues their jobs.
 * Idempotent: the PENDING→SOURCES_CREATED transition is a guarded update, so
 * concurrent or repeated calls create sources once and later calls return
 * the same sources, retrying only the queueing step if it had failed.
 */
@Injectable()
export class CompleteSourceUploadUseCase {
  private readonly logger = new Logger(CompleteSourceUploadUseCase.name);

  constructor(
    private readonly access: SourceUploadSessionAccessService,
    private readonly sessions: SourceUploadSessionRepository,
    private readonly sourceRepository: SourceRepository,
    private readonly spreadsheetParser: SpreadsheetParserPort,
    private readonly createProcessingSource: CreateProcessingSourceUseCase,
    private readonly getObjectInfo: GetObjectInfoUseCase,
    private readonly downloadObject: DownloadObjectUseCase,
    private readonly queueing: SourceUploadQueueingService,
    private readonly storageCleanup: SourceUploadStorageCleanupService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    command: CompleteSourceUploadCommand,
  ): Promise<CompletedSourceUpload> {
    const session = await this.access.requireOwned(command.uploadId);
    if (
      session.targetType !== command.targetType ||
      session.targetId !== command.targetId
    ) {
      throw new SourceUploadTargetMismatchError(session.id);
    }

    let created = false;
    if (session.status === SourceUploadSessionStatus.PENDING) {
      created = await this.createSources(session, command);
    }
    // False only for the call that actually created the sources; a replay
    // and the loser of a concurrent completion both find them in place.
    const alreadyCompleted = !created;

    const current = await this.sessions.findById(session.id);
    if (current?.status === SourceUploadSessionStatus.SOURCES_CREATED) {
      await this.queueing.tryQueue(current);
    } else if (current?.status !== SourceUploadSessionStatus.COMPLETED) {
      throw new SourceUploadExpiredError(session.id);
    }

    const sources = await this.sourceRepository.findByIds(
      current.sources.map((target) => target.sourceId),
    );
    return { sources, alreadyCompleted };
  }

  private async createSources(
    session: SourceUploadSession,
    command: CompleteSourceUploadCommand,
  ): Promise<boolean> {
    if (session.expiresAt.getTime() <= Date.now()) {
      if (await this.expire(session)) {
        throw new SourceUploadExpiredError(session.id);
      }
      // A completion that started before the deadline already claimed it;
      // the caller re-reads the session and returns those sources.
      return false;
    }
    const etag = await this.verifyStoredObject(session);
    const plans = await this.planSources(session, etag);
    command.ensureCapacityFor?.(plans.length);
    const planned = plans.map((plan) => ({ ...plan, sourceId: randomUUID() }));
    const won = await this.claimAndCreateSources(
      session,
      planned,
      etag,
      command,
    );
    // After the transaction: a failed attachment rolls the claim back.
    if (won) recordSourceUploadOutcome('completed', session);
    this.logger.log(
      { uploadId: session.id, sources: planned.length, won },
      'Completed source upload',
    );
    return won;
  }

  private async expire(session: SourceUploadSession): Promise<boolean> {
    const expired = await this.sessions.transition(
      session.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.EXPIRED,
    );
    if (!expired) return false;
    recordSourceUploadOutcome('expired', session);
    await this.storageCleanup.discard(session);
    return true;
  }

  private async verifyStoredObject(
    session: SourceUploadSession,
  ): Promise<string> {
    let size: number;
    let etag: string;
    try {
      ({ size, etag } = await this.getObjectInfo.execute(
        new GetObjectInfoCommand(session.storageKey),
      ));
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw new SourceUploadIncompleteError(session.id, {
          reason: 'missing',
        });
      }
      throw error;
    }
    if (size !== session.fileSize) {
      await this.abortForMismatchedBytes(session);
      throw new SourceUploadIncompleteError(session.id, {
        reason: 'size-mismatch',
        expectedSize: session.fileSize,
        storedSize: size,
      });
    }
    return etag;
  }

  private async planSources(
    session: SourceUploadSession,
    etag: string,
  ): Promise<DataSourcePlan[]> {
    const whole = [{ name: session.fileName, sheetName: null }];
    if (session.pipeline === SourceUploadPipeline.DOCUMENT) return whole;
    const detected = detectFileType(session.fileType, session.fileName);
    if (isCSVFile(detected)) return whole;
    // Workbook sheets are only known from the bytes; the file is read once
    // here so each sheet gets its own source. The read is capped at the
    // verified size: a still-valid signed URL could grow the object meanwhile.
    const fileData = await this.readWorkbook(session, etag);
    return resolveDataSourcePlans(this.spreadsheetParser, {
      fileData,
      fileName: session.fileName,
      kind: 'spreadsheet',
    });
  }

  // The queue-side read helper reports a mismatch with the storage key in its
  // metadata, which a 409 would echo to the client; on the request path the
  // object is dropped like a size mismatch and only the upload id is named.
  private async readWorkbook(
    session: SourceUploadSession,
    etag: string,
  ): Promise<Buffer> {
    try {
      return await downloadMinioFile(
        this.downloadObject,
        session.storageKey,
        session.fileSize,
        etag,
      );
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw new SourceUploadIncompleteError(session.id, {
          reason: 'missing',
        });
      }
      if (
        !(error instanceof StoredFileMismatchError) &&
        !(error instanceof ObjectChangedError)
      )
        throw error;
      await this.abortForMismatchedBytes(session);
      throw new SourceUploadIncompleteError(session.id, { reason: 'changed' });
    }
  }

  // Wrong bytes end the session like a user abort: the guarded
  // PENDING→ABORTED transition is taken before anything is deleted, so a
  // concurrent completion that verified the earlier bytes can no longer claim
  // the session and attach sources to a removed object. Once a completion has
  // claimed it, the object stays and the worker's ETag check decides.
  private async abortForMismatchedBytes(
    session: SourceUploadSession,
  ): Promise<void> {
    const aborted = await this.sessions.transition(
      session.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.ABORTED,
    );
    if (!aborted) return;
    recordSourceUploadOutcome('aborted', session);
    await this.storageCleanup.discard(session);
  }

  @Transactional()
  private async claimAndCreateSources(
    session: SourceUploadSession,
    planned: PlannedSource[],
    etag: string,
    command: CompleteSourceUploadCommand,
  ): Promise<boolean> {
    // The guarded update also row-locks the session, so a concurrent call
    // waits here and then loses the claim instead of creating duplicates.
    const claimed = await this.sessions.transition(
      session.id,
      SourceUploadSessionStatus.PENDING,
      SourceUploadSessionStatus.SOURCES_CREATED,
    );
    if (!claimed) return false;
    const sources: Source[] = [];
    for (const plan of planned) {
      sources.push(await this.createSource(session, plan));
    }
    await command.attach?.(sources);
    const targets: UploadedSourceReference[] = planned.map(
      ({ sourceId, sheetName }) => ({
        sourceId,
        sheetName,
      }),
    );
    await this.sessions.recordVerifiedSources(session.id, targets, etag);
    return true;
  }

  private async createSource(
    session: SourceUploadSession,
    plan: PlannedSource,
  ): Promise<Source> {
    if (session.pipeline === SourceUploadPipeline.DOCUMENT) {
      return this.createProcessingSource.execute(
        new CreateProcessingSourceCommand({
          id: plan.sourceId,
          fileType: session.fileType,
          fileName: session.fileName,
          storageKey: session.storageKey,
        }),
      );
    }
    return this.sourceRepository.save(
      new CSVDataSource({
        id: plan.sourceId,
        name: plan.name,
        data: { headers: [], rows: [] },
        status: SourceStatus.PROCESSING,
        storageKey: session.storageKey,
      }),
    );
  }
}
