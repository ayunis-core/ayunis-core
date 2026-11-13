import type { UUID } from 'crypto';
import type { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';

export class CreateSourceUploadSessionCommand {
  readonly targetType: SourceUploadTargetType;
  readonly targetId: UUID | null;
  readonly fileName: string;
  /** MIME type as declared by the browser; may be empty or generic. */
  readonly mimeType: string;
  readonly fileSize: number;
  readonly maxFileSizeBytes: number;

  constructor(params: {
    targetType: SourceUploadTargetType;
    targetId: UUID | null;
    fileName: string;
    mimeType: string;
    fileSize: number;
    maxFileSizeBytes: number;
  }) {
    this.targetType = params.targetType;
    this.targetId = params.targetId;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.fileSize = params.fileSize;
    this.maxFileSizeBytes = params.maxFileSizeBytes;
  }
}
