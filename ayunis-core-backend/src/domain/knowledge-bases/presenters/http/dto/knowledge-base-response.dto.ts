import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class KnowledgeBaseResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the knowledge base',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({
    description: 'The name of the knowledge base',
    example: 'Stadtratsprotokolle 2025',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the knowledge base',
    example: 'Sammlung aller Stadtratsprotokolle aus dem Jahr 2025',
  })
  description: string;

  @ApiProperty({
    description: 'The date and time when the knowledge base was created',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the knowledge base was last updated',
    example: '2025-01-15T10:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description:
      'Whether the knowledge base is shared with the current user (not owned). Only present when relevant (e.g., listing user knowledge bases).',
    example: false,
    required: false,
  })
  isShared?: boolean;
}

export class KnowledgeBaseListResponseDto {
  @ApiProperty({
    description: 'The list of knowledge bases',
    type: [KnowledgeBaseResponseDto],
  })
  data: KnowledgeBaseResponseDto[];
}
