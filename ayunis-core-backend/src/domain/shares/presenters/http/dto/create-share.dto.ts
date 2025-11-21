import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { SharedEntityType } from '../../../domain/value-objects/shared-entity-type.enum';

/**
 * Base DTO for creating shares
 */
export abstract class CreateShareDto {
  @ApiProperty({
    description: 'Type of entity being shared',
    enum: SharedEntityType,
  })
  @IsEnum(SharedEntityType)
  entityType: SharedEntityType;
}

/**
 * DTO for creating agent shares
 * Shares are automatically scoped to the user's organization
 */
export class CreateAgentShareDto extends CreateShareDto {
  @ApiProperty({
    description: 'ID of the agent to share',
    format: 'uuid',
  })
  @IsUUID()
  agentId: string;

  constructor() {
    super();
    this.entityType = SharedEntityType.AGENT;
  }
}
