import { ApiProperty } from '@nestjs/swagger';

export class ToggleThreadPinnedResponseDto {
  @ApiProperty({
    description: 'Whether the thread is pinned after the toggle',
    example: true,
  })
  isPinned: boolean;
}
