import { ApiProperty } from '@nestjs/swagger';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';

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
}

export class KnowledgeBaseDocumentListResponseDto {
  @ApiProperty({
    description: 'The list of documents in the knowledge base',
    type: [KnowledgeBaseDocumentResponseDto],
  })
  data: KnowledgeBaseDocumentResponseDto[];
}
