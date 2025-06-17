import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitterProvider } from '../../../domain/splitter-provider.enum';

export class TextChunkDto {
  @ApiProperty({
    description: 'The text content of the chunk',
    type: String,
  })
  text: string;

  @ApiPropertyOptional({
    description: 'Metadata about the chunk',
    type: Object,
    example: {
      index: 0,
      lineCount: 5,
      hasHeader: true,
      startLine: 1,
      endLine: 5,
    },
  })
  metadata?: Record<string, any>;
}

export class SplitResultDto {
  @ApiProperty({
    description: 'The chunks of text produced by the splitting operation',
    type: [TextChunkDto],
  })
  chunks: TextChunkDto[];

  @ApiProperty({
    description: 'Metadata about the split operation',
    type: Object,
    example: {
      provider: SplitterProvider.RECURSIVE,
      chunkSize: 1000,
      chunkOverlap: 200,
      totalChunks: 5,
    },
  })
  metadata: {
    provider: SplitterProvider;
    chunkSize?: number;
    chunkOverlap?: number;
    preserveHeader?: boolean;
    skipBlankLines?: boolean;
    totalChunks: number;
    [key: string]: any;
  };
}
