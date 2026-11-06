import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import type { UUID } from 'crypto';
import { IsIdForOwnerType } from 'src/common/validators/is-id-for-owner-type.validator';
import type {
  KnowledgeBaseListScope,
  KnowledgeBaseOwner,
} from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export enum KnowledgeBaseOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
  TEAM = 'team',
  ORG = 'org',
}

const LIST_SCOPE_TYPES = [
  KnowledgeBaseOwnerType.PERSONAL,
  KnowledgeBaseOwnerType.WORKSPACE,
];

export abstract class KnowledgeBaseListScopeDto {
  @ApiProperty({ enum: LIST_SCOPE_TYPES })
  @IsIn(LIST_SCOPE_TYPES)
  ownerType: KnowledgeBaseOwnerType.PERSONAL | KnowledgeBaseOwnerType.WORKSPACE;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(KnowledgeBaseOwnerType.WORKSPACE)
  workspaceId?: UUID;
}

export abstract class KnowledgeBaseOwnerDto {
  @ApiProperty({ enum: KnowledgeBaseOwnerType })
  @IsEnum(KnowledgeBaseOwnerType)
  ownerType: KnowledgeBaseOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(KnowledgeBaseOwnerType.WORKSPACE)
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(KnowledgeBaseOwnerType.TEAM)
  teamId?: UUID;
}

export function toKnowledgeBaseListScope(
  dto: KnowledgeBaseListScopeDto,
): KnowledgeBaseListScope {
  return dto.ownerType === KnowledgeBaseOwnerType.WORKSPACE
    ? { type: 'workspace', workspaceId: dto.workspaceId! }
    : { type: 'personal' };
}

export function toKnowledgeBaseOwner(
  dto: KnowledgeBaseOwnerDto,
): KnowledgeBaseOwner {
  switch (dto.ownerType) {
    case KnowledgeBaseOwnerType.WORKSPACE:
      return { type: 'workspace', workspaceId: dto.workspaceId! };
    case KnowledgeBaseOwnerType.TEAM:
      return { type: 'team', teamId: dto.teamId! };
    case KnowledgeBaseOwnerType.ORG:
      return { type: 'org' };
    case KnowledgeBaseOwnerType.PERSONAL:
      return { type: 'personal' };
  }
}
