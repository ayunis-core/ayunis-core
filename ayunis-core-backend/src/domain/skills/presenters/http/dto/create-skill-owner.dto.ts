import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { UUID } from 'crypto';
import { IsOwnerReference } from 'src/common/validators/is-owner-reference.validator';
import type { SkillOwner } from 'src/domain/skills/application/models/skill-owner';

export enum CreateSkillOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
  TEAM = 'team',
  ORG = 'org',
}

export abstract class CreateSkillOwnerDto {
  @ApiProperty({ enum: CreateSkillOwnerType })
  @IsEnum(CreateSkillOwnerType)
  ownerType: CreateSkillOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOwnerReference(CreateSkillOwnerType.WORKSPACE)
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsOwnerReference(CreateSkillOwnerType.TEAM)
  teamId?: UUID;
}

export function toCreateSkillOwner(dto: CreateSkillOwnerDto): SkillOwner {
  switch (dto.ownerType) {
    case CreateSkillOwnerType.WORKSPACE:
      return { type: 'workspace', workspaceId: dto.workspaceId! };
    case CreateSkillOwnerType.TEAM:
      return { type: 'team', teamId: dto.teamId! };
    case CreateSkillOwnerType.ORG:
      return { type: 'org' };
    case CreateSkillOwnerType.PERSONAL:
      return { type: 'personal' };
  }
}
