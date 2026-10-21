export class FileRetrieverResult {
  constructor(
    public readonly pages: FileRetrieverPage[] = [],
    public readonly metadata: Record<string, unknown> = {},
    /** Time spent converting to PDF before extraction; absent when no conversion ran. */
    public readonly conversionMs?: number,
  ) {}
}

export class FileRetrieverPage {
  public readonly text: string;

  constructor(
    text: string,
    public readonly number: number,
    public readonly metadata: Record<string, unknown> = {},
  ) {
    // Remove null bytes that cause PostgreSQL UTF-8 encoding errors
    this.text = text.replaceAll('\0', '');
  }
}
