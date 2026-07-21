import type { UUID } from 'crypto';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';

export class AddFileSourceToSkillCommand {
  constructor(
    public readonly skillId: UUID,
    public readonly file: UploadedFileRef,
  ) {}
}
