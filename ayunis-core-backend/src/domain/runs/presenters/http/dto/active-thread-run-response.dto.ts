import { ApiProperty } from '@nestjs/swagger';
import type { UUID } from 'crypto';

export class ActiveThreadRunResponseDto {
  @ApiProperty({ type: 'string', format: 'uuid' })
  threadId: UUID;

  @ApiProperty({
    description:
      'Whether the run can be stopped from the chat. Routine executions cannot.',
  })
  cancellable: boolean;
}
