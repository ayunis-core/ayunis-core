import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn } from 'class-validator';
import { IsIdForOwnerType } from 'src/common/validators/is-id-for-owner-type.validator';
import type { UUID } from 'crypto';
import type {
  SkillListScope,
  SkillOwner,
} from 'src/domain/skills/application/models/skill-owner';

export enum SkillOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
  TEAM = 'team',
  ORG = 'org',
}

const LIST_SCOPE_TYPES = [SkillOwnerType.PERSONAL, SkillOwnerType.WORKSPACE];

export abstract class SkillListScopeDto {
  @ApiProperty({ enum: LIST_SCOPE_TYPES })
  @IsIn(LIST_SCOPE_TYPES)
  ownerType: SkillOwnerType.PERSONAL | SkillOwnerType.WORKSPACE;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(SkillOwnerType.WORKSPACE)
  workspaceId?: UUID;
}

export abstract class SkillOwnerDto {
  @ApiProperty({ enum: SkillOwnerType })
  @IsEnum(SkillOwnerType)
  ownerType: SkillOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(SkillOwnerType.WORKSPACE)
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwnerType(SkillOwnerType.TEAM)
  teamId?: UUID;
}

export function toSkillListScope(dto: SkillListScopeDto): SkillListScope {
  return dto.ownerType === SkillOwnerType.WORKSPACE
    ? { type: 'workspace', workspaceId: dto.workspaceId! }
    : { type: 'personal' };
}

export function toSkillOwner(dto: SkillOwnerDto): SkillOwner {
  switch (dto.ownerType) {
    case SkillOwnerType.WORKSPACE:
      return { type: 'workspace', workspaceId: dto.workspaceId! };
    case SkillOwnerType.TEAM:
      return { type: 'team', teamId: dto.teamId! };
    case SkillOwnerType.ORG:
      return { type: 'org' };
    case SkillOwnerType.PERSONAL:
      return { type: 'personal' };
  }
}
