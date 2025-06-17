export class FileRetrieverResult {
  constructor(
    public readonly pages: FileRetrieverPage[] = [],
    public readonly metadata: Record<string, any> = {},
  ) {}
}

export class FileRetrieverPage {
  constructor(
    public readonly text: string,
    public readonly number: number,
    public readonly metadata: Record<string, any> = {},
  ) {}
}
