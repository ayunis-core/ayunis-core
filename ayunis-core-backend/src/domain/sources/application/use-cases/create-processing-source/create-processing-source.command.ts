export class CreateProcessingSourceCommand {
  readonly fileType: string;
  readonly fileName: string;

  constructor(params: { fileType: string; fileName: string }) {
    this.fileType = params.fileType;
    this.fileName = params.fileName;
  }
}
