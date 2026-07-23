import { Injectable, Logger } from '@nestjs/common';
import {
  SplitterHandler,
  SplitterInput,
} from '../../application/ports/splitter.handler';
import { SplitResult, TextChunk } from '../../domain/split-result.entity';
import { SplitterProcessingError } from '../../application/splitter.errors';
import { SplitterType } from '../../domain/splitter-type.enum';
import {
  ChunkAssembler,
  PositionedChunk,
  SplitConfig,
} from './chunk-assembler';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

// Separators in order of preference: paragraphs, lines, sentence
// boundaries, clauses, words, and character-level as last resort.
const DEFAULT_SEPARATORS = [
  '\n\n',
  '\n',
  '. ',
  '! ',
  '? ',
  '; ',
  ', ',
  ' ',
  '',
] as const;

// Immutable state threaded through the recursive split. Recursion is bounded
// by the separator list: every recursive call advances separatorIndex.
interface RecursiveSplitContext {
  readonly config: SplitConfig;
  readonly separatorIndex: number;
  readonly baseOffset: number;
}

@Injectable()
export class RecursiveSplitterHandler extends SplitterHandler {
  private readonly logger = new Logger(RecursiveSplitterHandler.name);

  isAvailable(): boolean {
    return true;
  }

  processText(input: SplitterInput): SplitResult {
    try {
      this.logger.debug(`Processing text with Recursive Text Splitter`);

      const config = this.resolveAndValidateConfig(input);

      this.logger.debug(
        `Chunk size: ${config.chunkSize}, Chunk overlap: ${config.chunkOverlap}`,
      );

      const rawChunks = this.ensureChunkSizeLimit(
        this.splitRecursively(input.text, {
          config,
          separatorIndex: 0,
          baseOffset: 0,
        }),
        config,
      );
      const textChunks = this.mapToTextChunks(input.text, rawChunks);

      return new SplitResult(textChunks, {
        provider: SplitterType.RECURSIVE,
        chunkSize: config.chunkSize,
        chunkOverlap: config.chunkOverlap,
        totalChunks: textChunks.length,
      });
    } catch (error) {
      this.logger.error(
        `Recursive Text Splitter processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new SplitterProcessingError(
        `Failed to process text with Recursive Text Splitter`,
        {
          provider: SplitterType.RECURSIVE,
          originalError: error as Error,
        },
      );
    }
  }

  /**
   * The algorithm relies on these invariants (e.g. chunkOverlap < chunkSize
   * guarantees forward progress in splitIntoFixedSizeChunks); rejecting
   * invalid input here beats silently adjusting it in the lower-level
   * methods.
   */
  private resolveAndValidateConfig(input: SplitterInput): SplitConfig {
    const chunkSize = input.metadata?.chunkSize ?? DEFAULT_CHUNK_SIZE;
    // Only explicit values are validated strictly; a defaulted overlap must
    // fit whatever chunkSize the caller chose, so it is capped at the same
    // 20% ratio the built-in defaults use (1000/200).
    const chunkOverlap =
      input.metadata?.chunkOverlap ??
      Math.min(DEFAULT_CHUNK_OVERLAP, Math.floor(chunkSize / 5));

    if (!this.isPositiveInteger(chunkSize)) {
      throw new Error(
        `chunkSize must be a positive integer, received ${chunkSize}`,
      );
    }
    if (!this.isValidOverlap(chunkOverlap, chunkSize)) {
      throw new Error(
        `chunkOverlap must be an integer between 0 and ${chunkSize - 1}, received ${chunkOverlap}`,
      );
    }

    return { chunkSize, chunkOverlap };
  }

  private isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
  }

  private isValidOverlap(overlap: number, chunkSize: number): boolean {
    return Number.isInteger(overlap) && overlap >= 0 && overlap < chunkSize;
  }

  private splitRecursively(
    text: string,
    context: RecursiveSplitContext,
  ): PositionedChunk[] {
    if (text.trim().length === 0) {
      return [];
    }

    if (text.length <= context.config.chunkSize) {
      return [
        new PositionedChunk(
          text,
          context.baseOffset,
          context.baseOffset + text.length,
          0,
        ),
      ];
    }

    if (context.separatorIndex >= DEFAULT_SEPARATORS.length) {
      return this.splitIntoFixedSizeChunks(
        text,
        context.config,
        context.baseOffset,
      );
    }

    const separator = DEFAULT_SEPARATORS[context.separatorIndex];

    // Character level is the last resort: hard-split
    if (separator === '') {
      return this.splitIntoFixedSizeChunks(
        text,
        context.config,
        context.baseOffset,
      );
    }

    const pieces = this.splitAndPreserveSeparator(text, separator);

    if (!pieces) {
      return this.splitRecursively(text, {
        ...context,
        separatorIndex: context.separatorIndex + 1,
      });
    }

    return this.assembleChunks(pieces, context);
  }

  /**
   * Reattaches separators so concatenating the pieces reconstructs the
   * original text exactly; returns null when the separator does not occur
   * in the text.
   */
  private splitAndPreserveSeparator(
    text: string,
    separator: string,
  ): string[] | null {
    const segments = text.split(separator);

    if (segments.length === 1) {
      return null;
    }

    return segments.map((segment, index) =>
      index < segments.length - 1 ? segment + separator : segment,
    );
  }

  /**
   * Oversized pieces are recursively split with the next separator before
   * being handed to the assembler, so no individual piece can bypass the
   * size limit regardless of its position in the text.
   */
  private assembleChunks(
    pieces: string[],
    context: RecursiveSplitContext,
  ): PositionedChunk[] {
    const assembler = new ChunkAssembler(context.config, context.baseOffset);

    for (const piece of pieces) {
      if (assembler.tryAppendPiece(piece)) {
        continue;
      }

      if (piece.length > context.config.chunkSize) {
        const recursivelySplitChunks = this.splitRecursively(piece, {
          ...context,
          separatorIndex: context.separatorIndex + 1,
          baseOffset: assembler.nextPieceOffset,
        });
        assembler.appendRecursivelySplitPiece(piece, recursivelySplitChunks);
        continue;
      }

      assembler.startChunkWithPiece(piece);
    }

    return assembler.build();
  }

  /**
   * Enforces the external contract that no chunk may exceed chunkSize.
   * Recursive splitting should already guarantee this; the fallback protects
   * callers from future changes to the splitting algorithm.
   */
  private ensureChunkSizeLimit(
    chunks: PositionedChunk[],
    config: SplitConfig,
  ): PositionedChunk[] {
    if (chunks.every((chunk) => chunk.text.length <= config.chunkSize)) {
      return chunks;
    }
    this.logger.warn(
      'Recursive split produced oversized chunks; falling back to character split for them',
    );
    return chunks.flatMap((chunk) =>
      chunk.text.length > config.chunkSize
        ? this.splitOversizedChunk(chunk, config)
        : [chunk],
    );
  }

  private splitOversizedChunk(
    chunk: PositionedChunk,
    config: SplitConfig,
  ): PositionedChunk[] {
    const pieces = this.splitIntoFixedSizeChunks(
      chunk.text,
      config,
      chunk.newContentStartOffset - chunk.carriedOverlapLength,
    );
    // Pieces overlapping the chunk's carried-overlap region inherit those
    // characters as their own overlap, so downstream offsets keep pointing
    // at content.
    return pieces.map((piece) => {
      const overlapCharacters = Math.max(
        0,
        chunk.newContentStartOffset - piece.newContentStartOffset,
      );
      return new PositionedChunk(
        piece.text,
        piece.newContentStartOffset + overlapCharacters,
        piece.contentEndOffset,
        overlapCharacters,
      );
    });
  }

  private splitIntoFixedSizeChunks(
    text: string,
    config: SplitConfig,
    baseOffset: number,
  ): PositionedChunk[] {
    const chunks: PositionedChunk[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + config.chunkSize, text.length);

      chunks.push(
        new PositionedChunk(
          text.slice(start, end),
          baseOffset + start,
          baseOffset + end,
          0,
        ),
      );

      // The last chunk consumed the rest of the text — stepping back for
      // overlap here would emit a duplicate tail-only chunk.
      if (end >= text.length) {
        break;
      }

      // Progress is guaranteed: config validation enforces overlap < size
      start = end - config.chunkOverlap;
    }

    return chunks;
  }

  /**
   * Materializes positioned chunks into TextChunks with character offsets
   * and 1-based line numbers, computed directly from the offsets tracked
   * during splitting — no text searching involved.
   */
  private mapToTextChunks(
    originalText: string,
    chunks: PositionedChunk[],
  ): TextChunk[] {
    if (chunks.length === 0) {
      return [];
    }

    const lineStartOffsets = this.collectLineStartOffsets(originalText);

    return chunks.map((chunk, index) => {
      const startCharOffset = this.resolveChunkStartOffset(originalText, chunk);
      const endCharOffset = chunk.contentEndOffset;

      return new TextChunk(chunk.text, {
        index,
        startCharOffset,
        endCharOffset,
        startLine: this.findLineNumber(lineStartOffsets, startCharOffset),
        endLine: this.findLineNumber(
          lineStartOffsets,
          Math.max(startCharOffset, endCharOffset - 1),
        ),
      });
    });
  }

  /**
   * The carried overlap usually sits directly before the chunk's content in
   * the original text; a bounded prefix compare confirms it. When the
   * overlap came from a non-adjacent region, the exact content position is
   * the honest answer.
   */
  private resolveChunkStartOffset(
    originalText: string,
    chunk: PositionedChunk,
  ): number {
    if (chunk.carriedOverlapLength === 0) {
      return chunk.newContentStartOffset;
    }
    const assumedStart =
      chunk.newContentStartOffset - chunk.carriedOverlapLength;
    return assumedStart >= 0 &&
      originalText.startsWith(chunk.carriedOverlap, assumedStart)
      ? assumedStart
      : chunk.newContentStartOffset;
  }

  /** Character offsets where each line starts; line 1 starts at offset 0. */
  private collectLineStartOffsets(text: string): number[] {
    const lineStartOffsets: number[] = [0];

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        lineStartOffsets.push(i + 1);
      }
    }

    return lineStartOffsets;
  }

  /**
   * Returns the 1-based line number for a given character offset.
   * Uses binary search for efficiency.
   */
  private findLineNumber(
    lineStartOffsets: number[],
    charOffset: number,
  ): number {
    let low = 0;
    let high = lineStartOffsets.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (lineStartOffsets[mid] <= charOffset) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low + 1;
  }
}
