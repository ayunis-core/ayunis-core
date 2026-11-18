import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SyncedFileState } from './synced-file-state.enum';
import type { SyncedFileSkipReason } from './synced-file-skip-reason.enum';

/** A file below a synced location, with the document it is imported as. */
export class SyncedFile {
  readonly id: UUID;
  readonly locationId: UUID;
  /** The provider's item ID, stable across renames and moves. */
  readonly externalId: string;
  name: string;
  /** Below the location, including the name. */
  path: string;
  version: string;
  size: number;
  state: SyncedFileState;
  skipReason: SyncedFileSkipReason | null;
  /** `null` while there is no document, also after a user removed it. */
  sourceId: UUID | null;
  /**
   * The document the file was last imported as. Unlike `sourceId`, it is
   * kept when a user removes the document, so the removal can be traced
   * back to the file.
   */
  lastSourceId: UUID | null;
  /**
   * The version the document was last processed at, successfully or not;
   * `null` until then.
   */
  documentVersion: string | null;
  /**
   * Why processing `documentVersion` failed; `null` when it succeeded. A
   * changed file that fails keeps a document holding the previous version.
   */
  processingErrorCode: SourceProcessingErrorCode | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    locationId: UUID;
    externalId: string;
    name: string;
    path: string;
    version: string;
    size: number;
    state: SyncedFileState;
    skipReason?: SyncedFileSkipReason | null;
    sourceId?: UUID | null;
    lastSourceId?: UUID | null;
    documentVersion?: string | null;
    processingErrorCode?: SourceProcessingErrorCode | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.locationId = params.locationId;
    this.externalId = params.externalId;
    this.name = params.name;
    this.path = params.path;
    this.version = params.version;
    this.size = params.size;
    this.state = params.state;
    this.skipReason = params.skipReason ?? null;
    this.sourceId = params.sourceId ?? null;
    this.lastSourceId = params.lastSourceId ?? null;
    this.documentVersion = params.documentVersion ?? null;
    this.processingErrorCode = params.processingErrorCode ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  /** Waiting for room, or imported but its document was removed. */
  needsDocument(): boolean {
    return (
      this.state === SyncedFileState.AWAITING_CAPACITY ||
      (this.state === SyncedFileState.IMPORTED && this.sourceId === null)
    );
  }

  /** Has a document that is not yet processed at the current version. */
  needsProcessing(): boolean {
    return this.sourceId !== null && this.documentVersion !== this.version;
  }

  skip(reason: SyncedFileSkipReason): void {
    this.state = SyncedFileState.SKIPPED;
    this.skipReason = reason;
    this.sourceId = null;
    this.forgetProcessing();
  }

  awaitCapacity(): void {
    this.state = SyncedFileState.AWAITING_CAPACITY;
    this.skipReason = null;
    this.sourceId = null;
    this.forgetProcessing();
  }

  importAs(sourceId: UUID): void {
    this.state = SyncedFileState.IMPORTED;
    this.skipReason = null;
    this.sourceId = sourceId;
    this.lastSourceId = sourceId;
    this.forgetProcessing();
  }

  /** The document processed at `version` took the place of the previous one. */
  replaceDocument(
    sourceId: UUID,
    version: string,
    errorCode: SourceProcessingErrorCode | null,
  ): void {
    this.sourceId = sourceId;
    this.lastSourceId = sourceId;
    this.recordProcessed(version, errorCode);
  }

  /** Processing `version` failed; the document keeps the previous one. */
  recordProcessed(
    version: string,
    errorCode: SourceProcessingErrorCode | null,
  ): void {
    this.documentVersion = version;
    this.processingErrorCode = errorCode;
  }

  private forgetProcessing(): void {
    this.documentVersion = null;
    this.processingErrorCode = null;
  }
}
