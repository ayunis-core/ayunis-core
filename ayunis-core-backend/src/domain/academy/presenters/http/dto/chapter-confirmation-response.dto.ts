import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class ChapterConfirmationResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  chapterId: UUID;

  @ApiProperty({ type: 'string', format: 'date-time' })
  confirmedAt: Date;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether all configured academy chapters are now confirmed',
  })
  academyCompleted: boolean;
}
