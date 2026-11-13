import type { UUID } from 'crypto';

export class CreateThreadSourceUploadCommand {
  readonly threadId?: UUID;
  readonly fileName: string;
  readonly mimeType: string;
  readonly fileSize: number;

  constructor(params: {
    threadId?: UUID;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }) {
    this.threadId = params.threadId;
    this.fileName = params.fileName;
    this.mimeType = params.mimeType;
    this.fileSize = params.fileSize;
  }
}
