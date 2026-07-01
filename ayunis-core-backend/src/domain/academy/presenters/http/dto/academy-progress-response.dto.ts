import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class ChapterProgressResponseDto {
  @ApiProperty({
    type: 'string',
    format: 'uuid',
    description: 'The chapter this progress refers to',
  })
  chapterId: UUID;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the learner has passed this chapter quiz',
  })
  passed: boolean;

  @ApiProperty({
    type: 'integer',
    description: 'Score of the most recent attempt, as a percentage',
    example: 80,
  })
  lastScore: number;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description: 'When the chapter was most recently passed, if ever',
  })
  lastPassedAt: Date | null;
}

export class AcademyProgressResponseDto {
  @ApiProperty({
    type: [ChapterProgressResponseDto],
    description: 'Per-chapter progress for the current user',
  })
  chapters: ChapterProgressResponseDto[];

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'When the user last completed the whole academy, or null if never',
  })
  academyCompletedAt: Date | null;
}
