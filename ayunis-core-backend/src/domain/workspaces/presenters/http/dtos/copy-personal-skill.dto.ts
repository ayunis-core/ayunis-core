import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { UUID } from 'crypto';

export class CopyPersonalSkillDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  skillId: UUID;
}
