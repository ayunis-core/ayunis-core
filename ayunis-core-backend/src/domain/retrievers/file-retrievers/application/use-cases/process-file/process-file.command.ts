import { UUID } from 'crypto';

export class ProcessFileCommand {
  public readonly orgId: UUID;
  public readonly fileData: Buffer;
  public readonly fileName: string;
  public readonly fileType: string;

  constructor(params: {
    orgId: UUID;
    fileData: Buffer;
    fileName: string;
    fileType: string;
  }) {
    this.orgId = params.orgId;
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
