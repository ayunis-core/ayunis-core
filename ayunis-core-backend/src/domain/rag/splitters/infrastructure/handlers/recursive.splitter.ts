import { Injectable, Logger } from '@nestjs/common';
import {
  SplitterHandler,
  SplitterInput,
} from '../../application/ports/splitter.handler';
import { SplitResult, TextChunk } from '../../domain/split-result.entity';
import { SplitterProcessingError } from '../../application/splitter.errors';
import { SplitterType } from '../../domain/splitter-type.enum';

interface ChunkPosition {
  startCharOffset: number;
  endCharOffset: number;
}

interface SplitConfig {
  chunkSize: number;
  chunkOverlap: number;
}

@Injectable()
export class RecursiveSplitterHandler extends SplitterHandler {
  private readonly logger = new Logger(RecursiveSplitterHandler.name);
  private readonly PROVIDER_NAME = SplitterType.RECURSIVE;
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_CHUNK_OVERLAP = 200;

  // Separators in order of preference: paragraphs, lines, sentence
  // boundaries, clauses, words, and character-level as last resort.
  private readonly SEPARATORS = [
    '\n\n',
    '\n',
    '. ',
    '! ',
    '? ',
    '; ',
    ', ',
    ' ',
    '',
  ];

  constructor() {
    super();
    this.logger.log('Initializing Recursive Text Splitter handler');
  }

  isAvailable(): boolean {
    return true; // Always available as it's implemented internally
  }

  processText(input: SplitterInput): SplitResult {
    try {
      this.logger.debug(`Processing text with Recursive Text Splitter`);

      // Extract metadata or use defaults
      const chunkSize = input.metadata?.chunkSize || this.DEFAULT_CHUNK_SIZE;
      const chunkOverlap =
        input.metadata?.chunkOverlap || this.DEFAULT_CHUNK_OVERLAP;

      this.logger.debug(
        `Chunk size: ${chunkSize}, Chunk overlap: ${chunkOverlap}`,
      );

      // Implement the recursive text splitting algorithm
      const chunks = this.enforceMaxChunkSize(
        this.splitTextRecursively(input.text, chunkSize, chunkOverlap),
        chunkSize,
        chunkOverlap,
      );

      // Add line number information to each chunk
      const chunksWithLineNumbers = this.addLineNumbers(input.text, chunks);

      return new SplitResult(chunksWithLineNumbers, {
        provider: this.PROVIDER_NAME,
        chunkSize,
        chunkOverlap,
        totalChunks: chunksWithLineNumbers.length,
      });
    } catch (error) {
      this.logger.error(
        `Recursive Text Splitter processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new SplitterProcessingError(
        `Failed to process text with Recursive Text Splitter`,
        {
          provider: this.PROVIDER_NAME,
          originalError: error as Error,
        },
      );
    }
  }

  private splitTextRecursively(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): TextChunk[] {
    return this.recursiveSplit(text, { chunkSize, chunkOverlap }, 0, 0);
  }

  private recursiveSplit(
    text: string,
    config: SplitConfig,
    separatorIndex: number,
    depth: number = 0,
  ): TextChunk[] {
    // Prevent excessive recursion
    if (depth > 10) {
      return this.splitByCharacter(text, config.chunkSize, config.chunkOverlap);
    }

    if (text.length <= config.chunkSize) {
      return text.trim().length > 0 ? [new TextChunk(text, { index: 0 })] : [];
    }

    if (separatorIndex >= this.SEPARATORS.length) {
      return this.splitByCharacter(text, config.chunkSize, config.chunkOverlap);
    }

    const separator = this.SEPARATORS[separatorIndex];

    // Character level is the last resort: hard-split
    if (separator === '') {
      return this.splitByCharacter(text, config.chunkSize, config.chunkOverlap);
    }

    const splits = text.split(separator);

    // Separator not found in text: try the next one
    if (splits.length === 1) {
      return this.recursiveSplit(text, config, separatorIndex + 1, depth + 1);
    }

    return this.combineSplits(splits, separator, config, separatorIndex, depth);
  }

  /**
   * Accumulates separator splits into chunks of at most chunkSize characters.
   * A single split larger than chunkSize is recursively split with the next
   * separator — regardless of position, so an oversized segment at the very
   * start of the text cannot be emitted whole (the bug that sent a full
   * document as one embedding input).
   */
  private combineSplits(
    splits: string[],
    separator: string,
    config: SplitConfig,
    separatorIndex: number,
    depth: number,
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    const pushChunk = (text: string) =>
      chunks.push(new TextChunk(text, { index: chunks.length }));
    // overlapSeed tracks the part of currentChunk that is only carried-over
    // overlap, so chunks containing no new content are never emitted.
    let currentChunk = '';
    let overlapSeed = '';

    for (let i = 0; i < splits.length; i++) {
      const split = i < splits.length - 1 ? splits[i] + separator : splits[i];
      const fitsCurrentChunk =
        currentChunk.length === 0 ||
        (currentChunk + split).length <= config.chunkSize;

      if (split.length <= config.chunkSize && fitsCurrentChunk) {
        currentChunk += split;
        continue;
      }

      if (this.hasNewContent(currentChunk, overlapSeed)) {
        pushChunk(currentChunk);
      }

      if (split.length > config.chunkSize) {
        const subChunks = this.recursiveSplit(
          split,
          config,
          separatorIndex + 1,
          depth + 1,
        );
        subChunks.forEach((subChunk) => pushChunk(subChunk.text));
        overlapSeed = this.getOverlapText(split, config.chunkOverlap);
        currentChunk = overlapSeed;
        continue;
      }

      // Seed the next chunk with the previous chunk's overlap — but only
      // when overlap plus content stays within the chunk size limit.
      const overlap = this.getOverlapText(currentChunk, config.chunkOverlap);
      if ((overlap + split).length <= config.chunkSize) {
        currentChunk = overlap + split;
        overlapSeed = overlap;
      } else {
        currentChunk = split;
        overlapSeed = '';
      }
    }

    if (this.hasNewContent(currentChunk, overlapSeed)) {
      pushChunk(currentChunk);
    }

    return chunks;
  }

  /**
   * currentChunk always begins with overlapSeed (it is only ever appended
   * to after being reset to the seed), so new content means non-whitespace
   * beyond the seed. Whitespace-only appends (e.g. the separator remainders
   * of an oversized segment) must not make a chunk emittable.
   */
  private hasNewContent(currentChunk: string, overlapSeed: string): boolean {
    return currentChunk.slice(overlapSeed.length).trim().length > 0;
  }

  /**
   * Safety net for the splitter's contract: no emitted chunk may exceed
   * chunkSize. Oversized chunks (e.g. from a future recursion edge case) are
   * hard-split so they can never reach an embeddings API whole.
   */
  private enforceMaxChunkSize(
    chunks: TextChunk[],
    chunkSize: number,
    chunkOverlap: number,
  ): TextChunk[] {
    if (chunks.every((chunk) => chunk.text.length <= chunkSize)) {
      return chunks;
    }
    this.logger.warn(
      'Recursive split produced oversized chunks; falling back to character split for them',
    );
    return chunks
      .flatMap((chunk) =>
        chunk.text.length > chunkSize
          ? this.splitByCharacter(chunk.text, chunkSize, chunkOverlap)
          : [chunk],
      )
      .map(
        (chunk, index) =>
          new TextChunk(chunk.text, { ...chunk.metadata, index }),
      );
  }

  private splitByCharacter(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): TextChunk[] {
    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    // Ensure overlap doesn't exceed chunk size to prevent infinite loops
    const safeOverlap = Math.min(chunkOverlap, Math.floor(chunkSize / 2));

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.slice(start, end);

      chunks.push(new TextChunk(chunkText, { index: chunkIndex++ }));

      // The last chunk consumed the rest of the text — stepping back for
      // overlap here would emit a duplicate tail-only chunk.
      if (end >= text.length) {
        break;
      }

      // Move start position, accounting for overlap
      const nextStart = end - safeOverlap;

      // Ensure we always make progress - if next start isn't ahead, just move to end
      start = nextStart > start ? nextStart : end;
    }

    return chunks;
  }

  private getOverlapText(text: string, overlapSize: number): string {
    if (overlapSize <= 0 || text.length <= overlapSize) {
      return text;
    }
    return text.slice(-overlapSize);
  }

  /**
   * Adds line number information to each chunk by finding its position in the original text.
   * Line numbers are 1-based to match standard text editor conventions.
   */
  private addLineNumbers(
    originalText: string,
    chunks: TextChunk[],
  ): TextChunk[] {
    if (chunks.length === 0) {
      return chunks;
    }

    // Build array of character offsets where each line starts
    const lineStarts = this.buildLineStarts(originalText);

    let searchStart = 0;
    return chunks.map((chunk) => {
      // Find this chunk's position in the original text
      const position = this.findChunkPosition(
        originalText,
        chunk.text,
        searchStart,
      );

      if (position === null) {
        // Chunk text not found in original
        this.logger.warn(
          `Could not find chunk position in original text. Chunk index: ${String(chunk.metadata.index)}`,
        );
        return new TextChunk(chunk.text, { ...chunk.metadata });
      }

      const { startCharOffset, endCharOffset } = position;

      // Advance search position for next chunk
      searchStart = Math.max(searchStart, startCharOffset + 1);

      // Calculate line numbers from character offsets
      const startLine = this.getLineNumber(lineStarts, startCharOffset);
      const endLine = this.getLineNumber(lineStarts, endCharOffset - 1);

      return new TextChunk(chunk.text, {
        ...chunk.metadata,
        startCharOffset,
        endCharOffset,
        startLine,
        endLine,
      });
    });
  }

  /**
   * Finds the position of a chunk in the original text.
   * When overlap is prepended to chunks, the full chunk text may not exist as a
   * contiguous substring. This method tries multiple strategies to find the position.
   */
  private findChunkPosition(
    originalText: string,
    chunkText: string,
    searchStart: number,
  ): ChunkPosition | null {
    // Strategy 1: Try finding the full chunk text
    const startCharOffset = this.indexOfNearOrAnywhere(
      originalText,
      chunkText,
      searchStart,
    );
    if (startCharOffset !== -1) {
      return {
        startCharOffset,
        endCharOffset: startCharOffset + chunkText.length,
      };
    }

    return (
      this.findBySuffix(originalText, chunkText, searchStart) ??
      this.findByMiddlePortion(originalText, chunkText, searchStart)
    );
  }

  /**
   * indexOf that prefers a match at or after searchStart but falls back to
   * searching from the beginning of the text.
   */
  private indexOfNearOrAnywhere(
    text: string,
    needle: string,
    searchStart: number,
  ): number {
    const offset = text.indexOf(needle, searchStart);
    return offset !== -1 ? offset : text.indexOf(needle);
  }

  /**
   * Strategy 2: The chunk might have overlap prepended that doesn't match
   * exactly. Try finding progressively smaller suffixes of the chunk — the
   * chunk conceptually starts where the suffix starts.
   */
  private findBySuffix(
    originalText: string,
    chunkText: string,
    searchStart: number,
  ): ChunkPosition | null {
    const minSearchLength = this.minSearchLength(chunkText);

    for (
      let suffixStart = 1;
      suffixStart < chunkText.length - minSearchLength;
      suffixStart++
    ) {
      const suffix = chunkText.slice(suffixStart);
      const suffixOffset = this.indexOfNearOrAnywhere(
        originalText,
        suffix,
        searchStart,
      );

      if (suffixOffset !== -1) {
        return {
          startCharOffset: suffixOffset,
          endCharOffset: suffixOffset + suffix.length,
        };
      }
    }

    return null;
  }

  /**
   * Strategy 3: Try finding a significant middle portion, skipping the first
   * and last 20% which might have overlap artifacts.
   */
  private findByMiddlePortion(
    originalText: string,
    chunkText: string,
    searchStart: number,
  ): ChunkPosition | null {
    const skipPercent = 0.2;
    const middleStart = Math.floor(chunkText.length * skipPercent);
    const middleEnd = Math.floor(chunkText.length * (1 - skipPercent));

    if (middleEnd <= middleStart + this.minSearchLength(chunkText)) {
      return null;
    }

    const middlePortion = chunkText.slice(middleStart, middleEnd);
    const middleOffset = this.indexOfNearOrAnywhere(
      originalText,
      middlePortion,
      searchStart,
    );

    if (middleOffset === -1) {
      return null;
    }

    return {
      startCharOffset: Math.max(0, middleOffset - middleStart),
      endCharOffset: Math.min(
        originalText.length,
        middleOffset - middleStart + chunkText.length,
      ),
    };
  }

  private minSearchLength(chunkText: string): number {
    return Math.min(50, Math.floor(chunkText.length / 2));
  }

  /**
   * Builds an array of character offsets where each line starts.
   * Line 1 starts at offset 0.
   */
  private buildLineStarts(text: string): number[] {
    const lineStarts: number[] = [0]; // Line 1 starts at offset 0

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        lineStarts.push(i + 1); // Next line starts after the newline
      }
    }

    return lineStarts;
  }

  /**
   * Returns the 1-based line number for a given character offset.
   * Uses binary search for efficiency.
   */
  private getLineNumber(lineStarts: number[], charOffset: number): number {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (lineStarts[mid] <= charOffset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low + 1; // Convert to 1-based line number
  }
}
