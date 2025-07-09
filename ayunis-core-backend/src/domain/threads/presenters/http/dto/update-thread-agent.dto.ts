import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

export class UpdateThreadAgentDto {
  @ApiProperty({
    description: 'The UUID of the agent to update',
    type: 'string',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  agentId: UUID;
}
