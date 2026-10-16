import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RecordModuleHeartbeatRequestDto {
  @ApiProperty({
    type: 'boolean',
    description:
      'True when the page just became visible; only starts the clock without crediting time since the previous heartbeat.',
  })
  @IsBoolean()
  sessionStart: boolean;
}
