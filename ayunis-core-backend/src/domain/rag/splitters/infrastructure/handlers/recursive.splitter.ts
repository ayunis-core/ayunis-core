import { Injectable, Logger } from '@nestjs/common';
import {
  SplitterHandler,
  SplitterInput,
} from '../../application/ports/splitter.handler';
import { SplitResult, TextChunk } from '../../domain/split-result.entity';
import { SplitterProcessingError } from '../../application/splitter.errors';
import { SplitterType } from '../../domain/splitter-type.enum';

@Injectable()
export class RecursiveSplitterHandler extends SplitterHandler {
  private readonly logger = new Logger(RecursiveSplitterHandler.name);
  private readonly PROVIDER_NAME = SplitterType.RECURSIVE;
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_CHUNK_OVERLAP = 200;

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
      const chunks = this.splitTextRecursively(
        input.text,
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
    // List of separators to try in order of preference
    const separators = [
      '\n\n', // Double newlines (paragraphs)
      '\n', // Single newlines
      '. ', // Sentences
      '! ', // Exclamations
      '? ', // Questions
      '; ', // Semicolons
      ', ', // Commas
      ' ', // Spaces
      '', // Character level (last resort)
    ];

    return this.recursiveSplit(text, chunkSize, chunkOverlap, separators, 0, 0);
  }

  private recursiveSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[],
    separatorIndex: number,
    depth: number = 0,
  ): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Prevent excessive recursion
    if (depth > 10) {
      return this.splitByCharacter(text, chunkSize, chunkOverlap);
    }

    // If text is small enough, return as single chunk
    if (text.length <= chunkSize) {
      if (text.trim().length > 0) {
        chunks.push(new TextChunk(text, { index: 0 }));
      }
      return chunks;
    }

    // If we've run out of separators, just split by character
    if (separatorIndex >= separators.length) {
      return this.splitByCharacter(text, chunkSize, chunkOverlap);
    }

    const separator = separators[separatorIndex];

    // Split by current separator
    if (separator === '') {
      // Character-level split
      return this.splitByCharacter(text, chunkSize, chunkOverlap);
    }

    const splits = text.split(separator);

    // If we only get one split (no separator found), try next separator
    if (splits.length === 1) {
      return this.recursiveSplit(
        text,
        chunkSize,
        chunkOverlap,
        separators,
        separatorIndex + 1,
        depth + 1,
      );
    }

    // Combine splits to create chunks
    let currentChunk = '';
    let chunkIndex = 0;

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i];
      const splitWithSeparator =
        i < splits.length - 1 ? split + separator : split;

      // Check if adding this split would exceed chunk size
      if (
        currentChunk.length > 0 &&
        (currentChunk + splitWithSeparator).length > chunkSize
      ) {
        // Current chunk is ready, save it
        chunks.push(new TextChunk(currentChunk, { index: chunkIndex++ }));

        // Start new chunk with overlap
        let overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText;

        // If this single split is still too large, recursively split it
        if (splitWithSeparator.length > chunkSize - overlapText.length) {
          const splitChunks = this.recursiveSplit(
            splitWithSeparator,
            chunkSize,
            chunkOverlap,
            separators,
            separatorIndex + 1,
            depth + 1,
          );

          // Add the recursively split chunks with overlap
          for (const splitChunk of splitChunks) {
            const finalChunkText = overlapText + splitChunk.text;
            chunks.push(new TextChunk(finalChunkText, { index: chunkIndex++ }));
            // Update overlap for next iteration
            overlapText = this.getOverlapText(finalChunkText, chunkOverlap);
          }
          currentChunk = overlapText;
        } else {
          // Add to current chunk
          currentChunk += splitWithSeparator;
        }
      } else {
        // Add to current chunk
        currentChunk += splitWithSeparator;
      }
    }

    // Add final chunk if there's content
    if (currentChunk.trim().length > 0) {
      chunks.push(new TextChunk(currentChunk, { index: chunkIndex }));
    }

    return chunks;
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
  ): { startCharOffset: number; endCharOffset: number } | null {
    // Strategy 1: Try finding the full chunk text
    let startCharOffset = originalText.indexOf(chunkText, searchStart);
    if (startCharOffset !== -1) {
      return {
        startCharOffset,
        endCharOffset: startCharOffset + chunkText.length,
      };
    }

    // Try from beginning as fallback
    startCharOffset = originalText.indexOf(chunkText);
    if (startCharOffset !== -1) {
      return {
        startCharOffset,
        endCharOffset: startCharOffset + chunkText.length,
      };
    }

    // Strategy 2: The chunk might have overlap prepended that doesn't match exactly.
    // Try finding progressively smaller suffixes of the chunk.
    // This handles cases where "overlapText + content" creates a string not in original.
    const minSearchLength = Math.min(50, Math.floor(chunkText.length / 2));

    for (
      let suffixStart = 1;
      suffixStart < chunkText.length - minSearchLength;
      suffixStart++
    ) {
      const suffix = chunkText.slice(suffixStart);
      const suffixOffset = originalText.indexOf(suffix, searchStart);

      if (suffixOffset !== -1) {
        // Found the suffix - calculate the approximate start position
        // The chunk conceptually starts where the suffix starts
        return {
          startCharOffset: suffixOffset,
          endCharOffset: suffixOffset + suffix.length,
        };
      }

      // Also try from beginning
      const suffixOffsetFromStart = originalText.indexOf(suffix);
      if (suffixOffsetFromStart !== -1) {
        return {
          startCharOffset: suffixOffsetFromStart,
          endCharOffset: suffixOffsetFromStart + suffix.length,
        };
      }
    }

    // Strategy 3: Try finding a significant middle portion
    // Skip first 20% and last 20% which might have overlap artifacts
    const skipPercent = 0.2;
    const middleStart = Math.floor(chunkText.length * skipPercent);
    const middleEnd = Math.floor(chunkText.length * (1 - skipPercent));

    if (middleEnd > middleStart + minSearchLength) {
      const middlePortion = chunkText.slice(middleStart, middleEnd);
      const middleOffset = originalText.indexOf(middlePortion, searchStart);

      if (middleOffset !== -1) {
        // Found middle portion - adjust offsets with bounds checking
        return {
          startCharOffset: Math.max(0, middleOffset - middleStart),
          endCharOffset: Math.min(
            originalText.length,
            middleOffset - middleStart + chunkText.length,
          ),
        };
      }

      const middleOffsetFromStart = originalText.indexOf(middlePortion);
      if (middleOffsetFromStart !== -1) {
        return {
          startCharOffset: Math.max(0, middleOffsetFromStart - middleStart),
          endCharOffset: Math.min(
            originalText.length,
            middleOffsetFromStart - middleStart + chunkText.length,
          ),
        };
      }
    }

    return null;
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
