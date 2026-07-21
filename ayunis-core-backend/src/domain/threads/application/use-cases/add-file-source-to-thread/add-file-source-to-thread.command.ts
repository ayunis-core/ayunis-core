import type { UUID } from 'crypto';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';

export class AddFileSourceToThreadCommand {
  public readonly threadId: UUID;
  public readonly file: UploadedFileRef;

  constructor(params: { threadId: UUID; file: UploadedFileRef }) {
    this.threadId = params.threadId;
    this.file = params.file;
  }
}
