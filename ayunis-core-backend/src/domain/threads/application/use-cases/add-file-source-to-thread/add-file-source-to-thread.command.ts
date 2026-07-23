import type { UUID } from 'crypto';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';

export class AddFileSourceToThreadCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly file: UploadedFileRef,
  ) {}
}
