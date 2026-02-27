import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
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
 * If teamId is provided, the share will be scoped to the team
 * Otherwise, the share will be scoped to the user's organization
 */
export class CreateAgentShareDto extends CreateShareDto {
  @ApiProperty({
    description: 'ID of the agent to share',
    format: 'uuid',
  })
  @IsUUID()
  agentId: string;

  @ApiPropertyOptional({
    description:
      'ID of the team to share with (if not provided, shares with entire organization)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  constructor() {
    super();
    this.entityType = SharedEntityType.AGENT;
  }
}

/**
 * DTO for creating skill shares
 * If teamId is provided, the share will be scoped to the team
 * Otherwise, the share will be scoped to the user's organization
 */
export class CreateSkillShareDto extends CreateShareDto {
  @ApiProperty({
    description: 'ID of the skill to share',
    format: 'uuid',
  })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({
    description:
      'ID of the team to share with (if not provided, shares with entire organization)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  constructor() {
    super();
    this.entityType = SharedEntityType.SKILL;
  }
}

/**
 * DTO for creating knowledge base shares
 * If teamId is provided, the share will be scoped to the team
 * Otherwise, the share will be scoped to the user's organization
 */
export class CreateKnowledgeBaseShareDto extends CreateShareDto {
  @ApiProperty({
    description: 'ID of the knowledge base to share',
    format: 'uuid',
  })
  @IsUUID()
  knowledgeBaseId: string;

  @ApiPropertyOptional({
    description:
      'ID of the team to share with (if not provided, shares with entire organization)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  constructor() {
    super();
    this.entityType = SharedEntityType.KNOWLEDGE_BASE;
  }
}
