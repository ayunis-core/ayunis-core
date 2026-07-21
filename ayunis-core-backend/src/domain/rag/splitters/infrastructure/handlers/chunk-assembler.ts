export interface SplitConfig {
  readonly chunkSize: number;
  readonly chunkOverlap: number;
}

/**
 * A chunk carrying absolute offsets into the original text, tracked while
 * splitting so positions never have to be searched for afterwards.
 * `newContentStartOffset` points at the first character after the carried
 * overlap — the overlap prefix may not sit contiguously before it in the
 * original text.
 */
export class PositionedChunk {
  constructor(
    readonly text: string,
    readonly newContentStartOffset: number,
    readonly contentEndOffset: number,
    readonly carriedOverlapLength: number,
  ) {}

  get carriedOverlap(): string {
    return this.text.slice(0, this.carriedOverlapLength);
  }
}

function takeTrailingCharacters(text: string, maximumLength: number): string {
  if (maximumLength <= 0) {
    return '';
  }
  return text.slice(-maximumLength);
}

/**
 * Accumulates split pieces into size-bounded chunks. Owns the overlap
 * carried between consecutive chunks and the offset of the next piece,
 * which makes every chunk's content position exact without ever searching
 * the text.
 */
export class ChunkAssembler {
  private readonly chunks: PositionedChunk[] = [];
  private currentChunkText = '';
  private carriedOverlap = '';
  private newContentStartOffset: number;
  private currentOffset: number;

  constructor(
    private readonly config: SplitConfig,
    baseOffset: number,
  ) {
    this.newContentStartOffset = baseOffset;
    this.currentOffset = baseOffset;
  }

  /** Absolute offset of the next piece in the original text. */
  get nextPieceOffset(): number {
    return this.currentOffset;
  }

  /**
   * Appends the piece to the current chunk when it fits within the size
   * limit; returns false otherwise so the caller can decide how to proceed.
   */
  tryAppendPiece(piece: string): boolean {
    const combinedLength = this.currentChunkText.length + piece.length;
    if (combinedLength > this.config.chunkSize) {
      return false;
    }
    if (this.currentChunkText.length === this.carriedOverlap.length) {
      this.newContentStartOffset = this.currentOffset;
    }
    this.currentChunkText += piece;
    this.currentOffset += piece.length;
    return true;
  }

  /**
   * Emits the current chunk and starts the next one from the piece —
   * seeded with the previous chunk's overlap when overlap plus piece stays
   * within the size limit.
   */
  startChunkWithPiece(piece: string): void {
    // Read the overlap before emitting so this method never depends on
    // whether emitCurrentChunk leaves currentChunkText intact.
    const overlap = takeTrailingCharacters(
      this.currentChunkText,
      this.config.chunkOverlap,
    );
    this.emitCurrentChunk();
    if (overlap.length + piece.length <= this.config.chunkSize) {
      this.currentChunkText = overlap + piece;
      this.carriedOverlap = overlap;
    } else {
      this.currentChunkText = piece;
      this.carriedOverlap = '';
    }
    this.newContentStartOffset = this.currentOffset;
    this.currentOffset += piece.length;
  }

  /**
   * Emits the current chunk, appends the chunks a deeper recursion built
   * for an oversized piece, and carries that piece's tail as the next
   * overlap.
   */
  appendRecursivelySplitPiece(
    piece: string,
    subChunks: PositionedChunk[],
  ): void {
    this.emitCurrentChunk();
    this.chunks.push(...subChunks);
    this.carriedOverlap = takeTrailingCharacters(
      piece,
      this.config.chunkOverlap,
    );
    this.currentChunkText = this.carriedOverlap;
    this.currentOffset += piece.length;
    this.newContentStartOffset = this.currentOffset;
  }

  build(): PositionedChunk[] {
    this.emitCurrentChunk();
    return this.chunks;
  }

  private emitCurrentChunk(): void {
    if (this.hasNonWhitespaceContent()) {
      this.chunks.push(
        new PositionedChunk(
          this.currentChunkText,
          this.newContentStartOffset,
          this.currentOffset,
          this.carriedOverlap.length,
        ),
      );
    }
  }

  /**
   * Returns true only when the current chunk contains non-whitespace
   * content beyond the overlap carried from the preceding chunk —
   * whitespace-only remainders (e.g. an oversized segment's trailing
   * separators) must not be emitted.
   */
  private hasNonWhitespaceContent(): boolean {
    return (
      this.currentChunkText.slice(this.carriedOverlap.length).trim().length > 0
    );
  }
}
