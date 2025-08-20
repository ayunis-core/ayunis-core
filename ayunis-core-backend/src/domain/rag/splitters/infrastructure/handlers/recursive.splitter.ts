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

      return new SplitResult(chunks, {
        provider: this.PROVIDER_NAME,
        chunkSize,
        chunkOverlap,
        totalChunks: chunks.length,
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
}
