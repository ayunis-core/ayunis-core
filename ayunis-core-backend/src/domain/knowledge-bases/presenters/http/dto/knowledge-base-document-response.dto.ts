import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SourceType,
  TextType,
} from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { ReindexIntervalDto } from './reindex-interval.dto';

export class KnowledgeBaseDocumentResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the document',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the document',
    example: 'Protokoll_Stadtrat_2025-03.pdf',
  })
  name: string;

  @ApiProperty({
    description: 'The type of the source',
    enum: SourceType,
    example: SourceType.TEXT,
  })
  type: string;

  @ApiProperty({
    description: 'Who created the source',
    enum: SourceCreator,
    example: SourceCreator.USER,
  })
  createdBy: SourceCreator;

  @ApiProperty({
    description: 'The date and time when the document was added',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'The date and time when the document was last updated',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'The processing status of the document',
    enum: SourceStatus,
    example: SourceStatus.READY,
  })
  status: SourceStatus;

  @ApiPropertyOptional({
    description:
      'Error message if processing failed (only present when status is failed)',
    example: 'OCR extraction timed out',
  })
  processingError?: string;

  @ApiPropertyOptional({
    description: 'The text source subtype (e.g. file, web)',
    enum: TextType,
    example: TextType.WEB,
  })
  textType?: TextType;

  @ApiPropertyOptional({
    description: 'The URL of the source (only for web sources)',
    example: 'https://example.com/page',
  })
  url?: string;

  @ApiProperty({
    description:
      'How often the web source is re-indexed automatically; null when it is not',
    type: ReindexIntervalDto,
    nullable: true,
  })
  reindexInterval: ReindexIntervalDto | null;

  @ApiProperty({
    description:
      'When the next automatic re-index is due; null when unscheduled',
    example: '2025-01-29T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  nextReindexAt: string | null;

  @ApiProperty({
    description:
      'When the content was last indexed successfully; the indexed content is from this date',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  lastIndexedAt: string | null;

  @ApiProperty({
    description:
      'When the last run failed; a failure later than lastIndexedAt means the source still serves the content from lastIndexedAt',
    example: '2025-01-29T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  lastRunFailedAt: string | null;

  @ApiProperty({
    description: 'Why the last run failed; null unless lastRunFailedAt is set',
    enum: SourceProcessingErrorCode,
    enumName: 'SourceProcessingErrorCode',
    nullable: true,
    example: SourceProcessingErrorCode.CONTENT_DEGRADED,
  })
  lastRunErrorCode: SourceProcessingErrorCode | null;
}

export class KnowledgeBaseDocumentListResponseDto {
  @ApiProperty({
    description: 'The list of documents in the knowledge base',
    type: [KnowledgeBaseDocumentResponseDto],
  })
  data: KnowledgeBaseDocumentResponseDto[];
}
