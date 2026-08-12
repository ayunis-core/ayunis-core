import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { IsUUID } from 'class-validator';
import { BaseCreatePermittedModelDto } from './base-create-permitted-model.dto';

export class CreateTeamPermittedModelDto extends BaseCreatePermittedModelDto {
  @ApiProperty({
    description: 'The ID of the catalog model to permit for the team',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  modelId: UUID;
}
