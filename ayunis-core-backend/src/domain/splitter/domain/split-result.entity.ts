export class SplitResult {
  constructor(
    public readonly chunks: TextChunk[],
    public readonly metadata: Record<string, unknown> = {},
  ) {}
}

export class TextChunk {
  constructor(
    public readonly text: string,
    public readonly metadata: Record<string, unknown> = {},
  ) {}
}
