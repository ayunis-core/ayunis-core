export class CreateProcessingUrlSourceCommand {
  readonly url: string;
  readonly maxDepth: number;

  constructor(params: { url: string; maxDepth: number }) {
    this.url = params.url;
    this.maxDepth = params.maxDepth;
  }
}
