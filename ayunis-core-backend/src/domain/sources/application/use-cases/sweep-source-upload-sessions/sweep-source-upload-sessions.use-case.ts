import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceUploadSessionRepository } from 'src/domain/sources/application/ports/source-upload-session.repository';
import { SourceUploadQueueingService } from 'src/domain/sources/application/services/source-upload-queueing.service';
import { SourceUploadStorageCleanupService } from 'src/domain/sources/application/services/source-upload-storage-cleanup.service';
import { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { SOURCE_UPLOAD_SESSION_RETENTION_MS } from 'src/domain/sources/domain/upload/source-upload.constants';
import type { IncompleteUpload } from 'src/domain/storage/domain/multipart-upload.object';
import { ListIncompleteUploadsUseCase } from 'src/domain/storage/application/use-cases/list-incomplete-uploads/list-incomplete-uploads.use-case';
import { ListIncompleteUploadsCommand } from 'src/domain/storage/application/use-cases/list-incomplete-uploads/list-incomplete-uploads.command';

/** Upper bound per category and run so a backlog cannot overlap the next run. */
const MAX_PER_RUN = 100;
/** A session whose queueing failed is retried after this grace period. */
const REQUEUE_GRACE_MS = 60 * 1000;
const UPLOAD_KEY_SEGMENT = '/uploads/';

export interface SourceUploadSweepResult {
  expired: number;
  requeued: number;
  abortedUploads: number;
  purgedSessions: number;
}

/**
 * Periodic reconciliation of direct uploads: abandoned sessions expire and
 * release their bytes, sessions whose queueing failed get their jobs queued,
 * multipart uploads no pending session claims are aborted, and finished
 * sessions age out once completion replays no longer need them.
 */
@Injectable()
export class SweepSourceUploadSessionsUseCase {
  private readonly logger = new Logger(SweepSourceUploadSessionsUseCase.name);

  constructor(
    private readonly sessions: SourceUploadSessionRepository,
    private readonly queueing: SourceUploadQueueingService,
    private readonly storageCleanup: SourceUploadStorageCleanupService,
    private readonly listIncompleteUploads: ListIncompleteUploadsUseCase,
  ) {}

  async execute(): Promise<SourceUploadSweepResult> {
    const now = new Date();
    const expired = await this.expireAbandoned(now);
    const requeued = await this.requeueStuck(now);
    const abortedUploads = await this.abortUnclaimedUploads();
    const purgedSessions = await this.purgeFinished(
      new Date(now.getTime() - SOURCE_UPLOAD_SESSION_RETENTION_MS),
    );
    return { expired, requeued, abortedUploads, purgedSessions };
  }

  private async purgeFinished(before: Date): Promise<number> {
    let purged = await this.sessions.deleteCompletedBefore(before);
    for (const status of [
      SourceUploadSessionStatus.ABORTED,
      SourceUploadSessionStatus.EXPIRED,
    ]) {
      const abandoned = await this.sessions.findByStatus(
        status,
        before,
        MAX_PER_RUN,
      );
      const cleaned: UUID[] = [];
      for (const session of abandoned) {
        // An issued PUT can finish after the initial abort/expiry deletion.
        if (await this.storageCleanup.discard(session))
          cleaned.push(session.id);
      }
      purged += await this.sessions.deleteAbandonedBefore(cleaned, before);
    }
    return purged;
  }

  private async expireAbandoned(now: Date): Promise<number> {
    const sessions = await this.sessions.findExpiredPending(now, MAX_PER_RUN);
    let expired = 0;
    for (const session of sessions) {
      const won = await this.sessions.transition(
        session.id,
        SourceUploadSessionStatus.PENDING,
        SourceUploadSessionStatus.EXPIRED,
      );
      if (!won) continue;
      await this.storageCleanup.discard(session);
      expired += 1;
    }
    return expired;
  }

  private async requeueStuck(now: Date): Promise<number> {
    const sessions = await this.sessions.findByStatus(
      SourceUploadSessionStatus.SOURCES_CREATED,
      new Date(now.getTime() - REQUEUE_GRACE_MS),
      MAX_PER_RUN,
    );
    let requeued = 0;
    for (const session of sessions) {
      if (await this.queueing.tryQueue(session)) requeued += 1;
    }
    return requeued;
  }

  private async abortUnclaimedUploads(): Promise<number> {
    let uploads: IncompleteUpload[];
    try {
      uploads = await this.listIncompleteUploads.execute(
        new ListIncompleteUploadsCommand(''),
      );
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'Could not list incomplete multipart uploads',
      );
      return 0;
    }
    let aborted = 0;
    for (const upload of uploads) {
      if (!upload.objectName.includes(UPLOAD_KEY_SEGMENT)) continue;
      const session = await this.sessions.findByStorageKey(upload.objectName);
      if (this.isClaimed(session, upload)) continue;
      await this.storageCleanup.abort(upload.objectName, upload.uploadId);
      aborted += 1;
    }
    return aborted;
  }

  private isClaimed(
    session: SourceUploadSession | null,
    upload: IncompleteUpload,
  ): boolean {
    return (
      session?.status === SourceUploadSessionStatus.PENDING &&
      session.multipartUploadId === upload.uploadId
    );
  }
}
