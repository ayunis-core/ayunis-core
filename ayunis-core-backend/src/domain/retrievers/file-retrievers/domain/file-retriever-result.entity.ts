export class FileRetrieverResult {
  constructor(
    public readonly pages: FileRetrieverPage[] = [],
    public readonly metadata: Record<string, any> = {},
  ) {}
}

export class FileRetrieverPage {
  public readonly text: string;

  constructor(
    text: string,
    public readonly number: number,
    public readonly metadata: Record<string, any> = {},
  ) {
    // Remove null bytes that cause PostgreSQL UTF-8 encoding errors
    // eslint-disable-next-line no-control-regex
    this.text = text.replace(/\x00/g, '');
  }
}
