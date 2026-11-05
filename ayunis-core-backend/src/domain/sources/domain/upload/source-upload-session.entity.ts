import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import {
  detectFileType,
  isCSVFile,
  isSpreadsheetFile,
} from 'src/common/util/file-type';
import { SourceUploadTargetType } from './source-upload-target-type.enum';
import { SourceUploadPipeline } from './source-upload-pipeline.enum';
import { SourceUploadSessionStatus } from './source-upload-session-status.enum';
import type { UploadedSourceReference } from './uploaded-source-reference';

export class SourceUploadSession {
  id: UUID;
  orgId: UUID;
  userId: UUID;
  targetType: SourceUploadTargetType;
  targetId: UUID;
  fileName: string;
  /** Canonical MIME type resolved from the declared type and the file name. */
  fileType: string;
  fileSize: number;
  storageKey: string;
  expectedETag: string | null;
  /** Whether the browser transfers the file as an S3 multipart upload. */
  multipart: boolean;
  /**
   * The multipart upload id the browser last had signed for this session,
   * so the sweep can tell a live upload from an abandoned one. Null until
   * the browser initiates the upload, and for single-request uploads.
   */
  multipartUploadId: string | null;
  status: SourceUploadSessionStatus;
  sources: UploadedSourceReference[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    userId: UUID;
    targetType: SourceUploadTargetType;
    targetId: UUID;
    fileName: string;
    fileType: string;
    fileSize: number;
    storageKey: string;
    expectedETag?: string | null;
    multipart?: boolean;
    multipartUploadId?: string | null;
    status?: SourceUploadSessionStatus;
    sources?: UploadedSourceReference[];
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.targetType = params.targetType;
    this.targetId = params.targetId;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.fileSize = params.fileSize;
    this.storageKey = params.storageKey;
    this.expectedETag = params.expectedETag ?? null;
    this.multipart = params.multipart ?? false;
    this.multipartUploadId = params.multipartUploadId ?? null;
    this.status = params.status ?? SourceUploadSessionStatus.PENDING;
    this.sources = params.sources ?? [];
    this.expiresAt = params.expiresAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get isTable(): boolean {
    const detected = detectFileType(this.fileType, this.fileName);
    return isCSVFile(detected) || isSpreadsheetFile(detected);
  }

  get pipeline(): SourceUploadPipeline {
    return this.isTable &&
      this.targetType !== SourceUploadTargetType.KNOWLEDGE_BASE
      ? SourceUploadPipeline.DATA_SOURCE
      : SourceUploadPipeline.DOCUMENT;
  }
}
