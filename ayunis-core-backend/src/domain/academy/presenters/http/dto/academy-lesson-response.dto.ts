import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class AcademyLessonResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The unique identifier of the lesson',
  })
  id: UUID;

  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The id of the chapter the lesson belongs to',
  })
  chapterId: UUID;

  @ApiProperty({
    type: 'string',
    description: 'The title of the lesson',
    example: 'Creating your first chat',
  })
  title: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'An optional description of the lesson',
    example: 'A short walkthrough of the chat interface.',
  })
  description: string | null;

  @ApiProperty({
    type: 'string',
    description: 'The Loom share or embed link of the lesson video',
    example: 'https://www.loom.com/share/abc123def456',
  })
  loomUrl: string;

  @ApiProperty({
    type: 'integer',
    description: 'The position of the lesson within its chapter (0-based)',
    example: 0,
  })
  position: number;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the lesson was created',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'The date the lesson was last updated',
  })
  updatedAt: Date;
}
