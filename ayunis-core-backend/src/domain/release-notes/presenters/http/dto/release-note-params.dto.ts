import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { UUID } from 'crypto';

export class ReleaseNoteParamsDto {
  @ApiProperty({
    format: 'uuid',
    description: 'The UUID of the release note',
  })
  @IsUUID()
  id: UUID;
}
