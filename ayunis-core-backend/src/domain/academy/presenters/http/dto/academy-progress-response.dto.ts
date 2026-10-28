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

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether confirming again now returns this confirmation unchanged instead of re-checking page time, so a lost response can be retried',
  })
  replayable: boolean;
}

export class CourseModuleProgressResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  courseModuleId: UUID;

  @ApiProperty({
    type: 'number',
    description:
      'Seconds the video page was open and visible since the last certificate. This is page time, not watch time.',
  })
  visibleSeconds: number;
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

  @ApiProperty({
    type: [CourseModuleProgressResponseDto],
    description:
      'Recorded page time per course module; modules never opened are omitted',
  })
  courseModules: CourseModuleProgressResponseDto[];

  @ApiProperty({
    type: 'integer',
    description:
      'Seconds every video page of a chapter must reach before the chapter can be confirmed',
  })
  minimumModuleSeconds: number;
}
