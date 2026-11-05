import type { UUID } from 'crypto';

export class CreateSkillSourceUploadCommand {
  readonly skillId: UUID;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;

  constructor(params: {
    skillId: UUID;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    this.skillId = params.skillId;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.fileSize = params.fileSize;
  }
}
