import { UUID } from 'crypto';

export class CreateFileSourceCommand {
  threadId?: UUID;
  userId: UUID;
  fileData: Buffer;
  fileName: string;
  fileType: string;
  fileSize: number;

  constructor(params: {
    threadId?: UUID;
    userId: UUID;
    fileData: Buffer;
    fileName: string;
    fileType: string;
    fileSize: number;
  }) {
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
    this.fileSize = params.fileSize;
  }
}
