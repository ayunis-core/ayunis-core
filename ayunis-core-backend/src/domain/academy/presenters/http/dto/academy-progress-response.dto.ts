import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class ChapterProgressResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  chapterId: UUID;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the learner has confirmed this chapter',
  })
  confirmed: boolean;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether the confirmation still counts toward annual renewal',
  })
  confirmationValid: boolean;

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    description: 'When the learner most recently confirmed the chapter',
  })
  confirmedAt: Date;
}

export class AcademyProgressResponseDto {
  @ApiProperty({
    type: [ChapterProgressResponseDto],
    description: 'Per-chapter confirmations for the current user',
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

  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    description:
      'When the completion stops being valid, or null if never completed',
  })
  academyCompletionExpiresAt: Date | null;
}
