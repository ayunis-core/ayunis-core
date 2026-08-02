import type { UUID } from 'crypto';
import type { UploadedFileRef } from 'src/common/util/source-file-upload';

export class AddFileSourceToSkillCommand {
  public readonly skillId: UUID;
  public readonly file: UploadedFileRef;

  constructor(params: { skillId: UUID; file: UploadedFileRef }) {
    this.skillId = params.skillId;
    this.file = params.file;
  }
}
