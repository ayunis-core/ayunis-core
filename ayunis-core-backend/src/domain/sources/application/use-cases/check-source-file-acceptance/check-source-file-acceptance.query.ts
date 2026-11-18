export class CheckSourceFileAcceptanceQuery {
  readonly fileName: string;
  readonly size: number;
  /** The target's limit for types without a limit of their own. */
  readonly maxFileSizeBytes: number;

  constructor(params: {
    fileName: string;
    size: number;
    maxFileSizeBytes: number;
  }) {
    this.fileName = params.fileName;
    this.size = params.size;
    this.maxFileSizeBytes = params.maxFileSizeBytes;
  }
}
