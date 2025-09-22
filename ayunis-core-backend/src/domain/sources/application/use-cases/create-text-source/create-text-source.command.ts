export abstract class CreateTextSourceCommand {}

export class CreateFileSourceCommand extends CreateTextSourceCommand {
  fileData: Buffer;
  fileName: string;
  fileType: string;

  constructor(params: {
    fileData: Buffer;
    fileName: string;
    fileType: string;
  }) {
    super();
    this.fileData = params.fileData;
    this.fileName = params.fileName;
    this.fileType = params.fileType;
  }
}

export class CreateUrlSourceCommand extends CreateTextSourceCommand {
  url: string;

  constructor(params: { url: string }) {
    super();
    this.url = params.url;
  }
}
