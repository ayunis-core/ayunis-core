import { Injectable } from '@nestjs/common';
import { SplitResult, TextChunk } from '../../../domain/split-result.entity';
import { SplitResultDto, TextChunkDto } from '../dto/split-result.dto';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';

@Injectable()
export class SplitResultMapper {
  /**
   * Maps a domain SplitResult to a SplitResultDto
   */
  mapToDto(result: SplitResult): SplitResultDto {
    return {
      chunks: this.mapChunks(result.chunks),
      metadata: this.mapMetadata(result),
    };
  }

  /**
   * Maps an array of TextChunk domain objects to TextChunkDto array
   */
  private mapChunks(chunks: TextChunk[]): TextChunkDto[] {
    return chunks.map((chunk) => this.mapChunk(chunk));
  }

  /**
   * Maps a single TextChunk to TextChunkDto
   */
  private mapChunk(chunk: TextChunk): TextChunkDto {
    return {
      text: chunk.text,
      metadata: chunk.metadata,
    };
  }

  /**
   * Extracts and maps metadata from a SplitResult
   */
  private mapMetadata(result: SplitResult): SplitResultDto['metadata'] {
    return {
      provider: result.metadata.provider as SplitterProvider,
      chunkSize: result.metadata.chunkSize as number,
      chunkOverlap: result.metadata.chunkOverlap as number,
      preserveHeader: result.metadata.preserveHeader as boolean,
      skipBlankLines: result.metadata.skipBlankLines as boolean,
      totalChunks:
        (result.metadata.totalChunks as number) ?? result.chunks.length,
      ...result.metadata,
    };
  }
}
