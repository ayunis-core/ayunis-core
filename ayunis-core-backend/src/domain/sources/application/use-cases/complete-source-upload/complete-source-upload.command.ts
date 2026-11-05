import type { Source } from 'src/domain/sources/domain/source.entity';
import type { UUID } from 'crypto';
import type { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';

export class CompleteSourceUploadCommand {
  readonly uploadId: UUID;
  readonly targetType: SourceUploadTargetType;
  readonly targetId: UUID;
  /**
   * Called with the number of sources this upload will create (one per data
   * sheet for workbooks) before any of them exist, so the caller can reject
   * an over-capacity upload with its own module's limit error.
   */
  readonly ensureCapacityFor?: (sourceCount: number) => void;

  /** Runs inside the source-creation transaction, before processing is queued. */
  readonly attach?: (sources: Source[]) => Promise<void>;

  constructor(params: {
    uploadId: UUID;
    targetType: SourceUploadTargetType;
    targetId: UUID;
    ensureCapacityFor?: (sourceCount: number) => void;
    attach?: (sources: Source[]) => Promise<void>;
  }) {
    this.uploadId = params.uploadId;
    this.targetType = params.targetType;
    this.targetId = params.targetId;
    this.ensureCapacityFor = params.ensureCapacityFor;
    this.attach = params.attach;
  }
}
