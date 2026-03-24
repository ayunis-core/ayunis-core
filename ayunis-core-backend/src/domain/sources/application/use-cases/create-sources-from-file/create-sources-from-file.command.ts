export class CreateSourcesFromFileCommand {
  public readonly filePath: string;
  public readonly originalName: string;
  public readonly mimeType: string;

  constructor(params: {
    filePath: string;
    originalName: string;
    mimeType: string;
  }) {
    this.filePath = params.filePath;
    this.originalName = params.originalName;
    this.mimeType = params.mimeType;
  }
}
