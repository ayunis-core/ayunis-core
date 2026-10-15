import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { UUID } from 'crypto';
import { IsOwnerReference } from 'src/common/validators/is-owner-reference.validator';
import type { KnowledgeBaseOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export enum CreateKnowledgeBaseOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
  TEAM = 'team',
  ORG = 'org',
}

export abstract class CreateKnowledgeBaseOwnerDto {
  @ApiProperty({ enum: CreateKnowledgeBaseOwnerType })
  @IsEnum(CreateKnowledgeBaseOwnerType)
  ownerType: CreateKnowledgeBaseOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOwnerReference(CreateKnowledgeBaseOwnerType.WORKSPACE)
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOwnerReference(CreateKnowledgeBaseOwnerType.TEAM)
  teamId?: UUID;
}

export function toCreateKnowledgeBaseOwner(
  dto: CreateKnowledgeBaseOwnerDto,
): KnowledgeBaseOwner {
  switch (dto.ownerType) {
    case CreateKnowledgeBaseOwnerType.WORKSPACE:
      return { type: 'workspace', workspaceId: dto.workspaceId! };
    case CreateKnowledgeBaseOwnerType.TEAM:
      return { type: 'team', teamId: dto.teamId! };
    case CreateKnowledgeBaseOwnerType.ORG:
      return { type: 'org' };
    case CreateKnowledgeBaseOwnerType.PERSONAL:
      return { type: 'personal' };
  }
}
