import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { IsUUID } from 'class-validator';
import { PermittedModelPolicyDto } from './permitted-model-policy.dto';

export class CreateTeamPermittedModelDto extends PermittedModelPolicyDto {
  @ApiProperty({
    description: 'The ID of the catalog model to permit for the team',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  modelId: UUID;
}
