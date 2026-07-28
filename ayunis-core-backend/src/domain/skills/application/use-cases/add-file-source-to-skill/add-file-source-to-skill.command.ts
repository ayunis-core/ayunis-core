import type { UUID } from 'crypto';

export class AddFileSourceToSkillCommand {
  public readonly skillId: UUID;
  public readonly fileData: Buffer;
  public readonly fileName: string;
  public readonly fileType: string;

  constructor(params: {
    skillId: UUID;
    fileData: Buffer;
    fileName: string;
    fileType: string;
  }) {
    this.skillId = params.skillId;
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
