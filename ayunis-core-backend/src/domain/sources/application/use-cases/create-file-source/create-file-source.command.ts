import { UUID } from 'crypto';

export class CreateFileSourceCommand {
  orgId: UUID;
  fileData: Buffer;
  fileName: string;
  fileType: string;
  fileSize: number;

  constructor(params: {
    orgId: UUID;
    fileData: Buffer;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) {
    this.orgId = params.orgId;
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.fileSize = params.fileSize;
  }
}
