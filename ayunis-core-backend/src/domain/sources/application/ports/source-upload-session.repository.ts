import type { UUID } from 'crypto';
import type { SourceUploadSession } from 'src/domain/sources/domain/upload/source-upload-session.entity';
import type { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import type { UploadedSourceReference } from 'src/domain/sources/domain/upload/uploaded-source-reference';

export abstract class SourceUploadSessionRepository {
  abstract save(session: SourceUploadSession): Promise<SourceUploadSession>;
  abstract findById(id: UUID): Promise<SourceUploadSession | null>;
  /**
   * Moves a session from `fromStatus` to `toStatus` in one guarded UPDATE
   * and returns whether this call won. Two concurrent completions therefore
   * create sources exactly once.
   */
  abstract transition(
    id: UUID,
    fromStatus: SourceUploadSessionStatus,
    toStatus: SourceUploadSessionStatus,
    updates?: Partial<{ sources: UploadedSourceReference[] }>,
  ): Promise<boolean>;
  abstract recordVerifiedSources(
    id: UUID,
    sources: UploadedSourceReference[],
    expectedETag: string,
  ): Promise<void>;
  /** Remembers the multipart upload id the browser is transferring under. */
  abstract recordMultipartUploadId(id: UUID, uploadId: string): Promise<void>;
  abstract findByStorageKey(
    storageKey: string,
  ): Promise<SourceUploadSession | null>;
  /** PENDING sessions whose transfer window closed before `now`. */
  abstract findExpiredPending(
    now: Date,
    limit: number,
  ): Promise<SourceUploadSession[]>;
  abstract findByStatus(
    status: SourceUploadSessionStatus,
    updatedBefore: Date,
    limit: number,
  ): Promise<SourceUploadSession[]>;
  abstract deleteCompletedBefore(before: Date): Promise<number>;
  abstract deleteAbandonedBefore(ids: UUID[], before: Date): Promise<number>;
}
