import type { Thread } from 'src/domain/threads/domain/thread.entity';

export class AddFileSourceToThreadCommand {
  readonly thread: Thread;
  readonly fileData: Buffer;
  readonly fileName: string;
  readonly fileType: string;

  constructor(params: {
    thread: Thread;
    fileData: Buffer;
    fileName: string;
    fileType: string;
  }) {
    this.thread = params.thread;
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}
