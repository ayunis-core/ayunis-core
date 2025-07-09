import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class CreateThreadDto {
  @ApiPropertyOptional({
    description: 'The id of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  modelId?: UUID;

  @ApiPropertyOptional({
    description: 'The id of the agent',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  agentId?: UUID;
}
