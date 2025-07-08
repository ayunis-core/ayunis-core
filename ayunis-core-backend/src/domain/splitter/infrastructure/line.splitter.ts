import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SplitterHandler,
  SplitterInput,
} from '../application/ports/splitter.handler';
import { SplitResult, TextChunk } from '../domain/split-result.entity';
import { SplitterProcessingError } from '../application/splitter.errors';
import { SplitterProvider } from '../domain/splitter-provider.enum';

export interface LineSplitterMetadata {
  chunkSize?: number;
  preserveHeader?: boolean;
  skipBlankLines?: boolean;
  detectQuotes?: boolean;
  headerRow?: string;
}

@Injectable()
export class LineSplitterHandler extends SplitterHandler {
  private readonly logger = new Logger(LineSplitterHandler.name);
  private readonly PROVIDER_NAME = SplitterProvider.LINE;
  private readonly DEFAULT_CHUNK_SIZE = 100; // Default number of lines per chunk

  constructor(private readonly configService: ConfigService) {
    super();
    this.logger.log('Initializing Line Splitter handler');
  }

  isAvailable(): boolean {
    return true; // Always available as it's implemented internally
  }

  processText(input: SplitterInput): SplitResult {
    try {
      this.logger.debug(`Processing text with Line Splitter`);

      // Extract metadata or use defaults
      const metadata = (input.metadata as LineSplitterMetadata) || {};
      const chunkSize = metadata.chunkSize || this.DEFAULT_CHUNK_SIZE;
      const preserveHeader =
        metadata.preserveHeader !== undefined ? metadata.preserveHeader : true;
      const skipBlankLines =
        metadata.skipBlankLines !== undefined ? metadata.skipBlankLines : true;
      const detectQuotes =
        metadata.detectQuotes !== undefined ? metadata.detectQuotes : true;
      const headerRow = metadata.headerRow;

      this.logger.debug(
        `Chunk size: ${chunkSize}, Preserve header: ${preserveHeader}, Skip blank lines: ${skipBlankLines}`,
      );

      // Implement the line splitting algorithm
      const chunks = this.splitTextByLines(input.text, chunkSize, {
        preserveHeader,
        skipBlankLines,
        detectQuotes,
        headerRow,
      });

      return new SplitResult(chunks, {
        provider: this.PROVIDER_NAME,
        chunkSize,
        preserveHeader,
        skipBlankLines,
        totalChunks: chunks.length,
      });
    } catch (error) {
      this.logger.error(
        `Line Splitter processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new SplitterProcessingError(
        `Failed to process text with Line Splitter`,
        {
          provider: this.PROVIDER_NAME,
          originalError: error as Error,
        },
      );
    }
  }

  private splitTextByLines(
    text: string,
    chunkSize: number,
    options: {
      preserveHeader: boolean;
      skipBlankLines: boolean;
      detectQuotes: boolean;
      headerRow?: string;
    },
  ): TextChunk[] {
    // Split the text into lines
    let lines = text.split('\n');

    // Skip blank lines if needed
    if (options.skipBlankLines) {
      lines = lines.filter((line) => line.trim().length > 0);
    }

    // If there's no text, return empty result
    if (lines.length === 0) {
      return [];
    }

    // Identify header row if needed
    let headerLine: string | undefined;

    if (options.headerRow) {
      // Use provided header
      headerLine = options.headerRow;
    } else if (options.preserveHeader) {
      // Use first line as header
      headerLine = lines[0];
      lines = lines.slice(1); // Remove header from lines to be chunked
    }

    // Handle CSV with quotes if needed
    if (options.detectQuotes) {
      // If we had broken quotes across lines, fix them
      lines = this.handleQuotedCSV(lines);
    }

    const chunks: TextChunk[] = [];
    let currentChunkLines: string[] = [];

    // Process lines into chunks
    for (let i = 0; i < lines.length; i++) {
      // Add header to each chunk if needed
      if (
        currentChunkLines.length === 0 &&
        headerLine &&
        options.preserveHeader
      ) {
        currentChunkLines.push(headerLine);
      }

      currentChunkLines.push(lines[i]);

      // Create a chunk when we reach the chunk size or end of lines
      if (
        currentChunkLines.length >=
          chunkSize + (headerLine && options.preserveHeader ? 1 : 0) ||
        i === lines.length - 1
      ) {
        chunks.push(
          new TextChunk(currentChunkLines.join('\n'), {
            index: chunks.length,
            lineCount: currentChunkLines.length,
            hasHeader: headerLine && options.preserveHeader ? true : false,
            startLine:
              i -
              currentChunkLines.length +
              1 +
              (headerLine && options.preserveHeader ? 1 : 0),
            endLine: i,
          }),
        );

        // Reset for next chunk
        currentChunkLines = [];
      }
    }

    return chunks;
  }

  private handleQuotedCSV(lines: string[]): string[] {
    const result: string[] = [];
    let currentLine = '';
    let inQuote = false;

    for (const line of lines) {
      // Count quotes to determine if we're still inside a quoted field
      const quoteCount = (line.match(/"/g) || []).length;

      if (!inQuote) {
        // Starting a new line
        currentLine = line;

        // If odd number of quotes, we're entering a quoted section that spans lines
        if (quoteCount % 2 !== 0) {
          inQuote = true;
        } else {
          // Complete line, add to result
          result.push(currentLine);
          currentLine = '';
        }
      } else {
        // We're in the middle of a quoted section
        currentLine += '\n' + line;

        // If odd number of quotes, we're exiting the quoted section
        if (quoteCount % 2 !== 0) {
          inQuote = false;
          result.push(currentLine);
          currentLine = '';
        }
      }
    }

    // Add any remaining content
    if (currentLine) {
      result.push(currentLine);
    }

    return result;
  }
}
