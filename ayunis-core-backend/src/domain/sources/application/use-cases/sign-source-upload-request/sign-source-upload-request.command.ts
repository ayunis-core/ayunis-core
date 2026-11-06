import type { UUID } from 'crypto';
import type { UploadRequestMethod } from 'src/domain/storage/domain/multipart-upload.object';

export class SignSourceUploadRequestCommand {
  readonly uploadId: UUID;
  readonly method: UploadRequestMethod;
  /** S3 multipart upload id; absent for a whole-object PUT and for initiation. */
  readonly multipartUploadId?: string;
  readonly partNumber?: number;

  constructor(params: {
    uploadId: UUID;
    method: UploadRequestMethod;
    multipartUploadId?: string;
    partNumber?: number;
  }) {
    this.uploadId = params.uploadId;
    this.method = params.method;
    this.multipartUploadId = params.multipartUploadId;
    this.partNumber = params.partNumber;
  }
}
