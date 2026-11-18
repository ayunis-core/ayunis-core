import type { UUID } from 'crypto';
import type { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';

export class CreateSourceUploadSessionCommand {
  readonly targetType: SourceUploadTargetType;
  readonly targetId: UUID;
  readonly fileName: string;
  /** MIME type as declared by the browser; may be empty or generic. */
  readonly mimeType: string;
  readonly fileSize: number;
  readonly maxFileSizeBytes: number;
  /**
   * Runs once every check has passed, right before the session is reserved,
   * so a refused file costs the caller nothing; throwing rejects the upload.
   */
  readonly admit?: () => Promise<void>;

  constructor(params: {
    targetType: SourceUploadTargetType;
    targetId: UUID;
    fileName: string;
    mimeType: string;
    fileSize: number;
    maxFileSizeBytes: number;
    admit?: () => Promise<void>;
  }) {
    this.targetType = params.targetType;
    this.targetId = params.targetId;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.fileSize = params.fileSize;
    this.maxFileSizeBytes = params.maxFileSizeBytes;
    this.admit = params.admit;
  }
}
