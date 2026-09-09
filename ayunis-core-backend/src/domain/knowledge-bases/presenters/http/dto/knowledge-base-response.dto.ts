import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export class KnowledgeBaseResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the knowledge base',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  id: UUID;

  @ApiProperty({ enum: ['personal', 'workspace'] })
  ownerType: 'personal' | 'workspace';

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'The owning workspace for workspace-owned knowledge bases',
  })
  workspaceId?: UUID;

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
    description: 'Number of documents assigned to the knowledge base',
    example: 3,
  })
  documentCount: number;

  @ApiProperty({
    description: 'Whether the knowledge base is active for the current user',
    example: true,
  })
  isActive: boolean;

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

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
