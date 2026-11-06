import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { IsEnum, IsIn, isUUID, registerDecorator } from 'class-validator';
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

/** Requires a UUID exactly when the DTO's `ownerType` is `ownerType`. */
function IsIdForOwner(
  ownerType: SkillOwnerType,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    const property = propertyKey.toString();
    registerDecorator({
      name: `is${property}ForSkillOwner`,
      target: target.constructor,
      propertyName: property,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as { ownerType?: SkillOwnerType };
          if (dto.ownerType === ownerType) {
            return typeof value === 'string' && isUUID(value);
          }
          return value === undefined;
        },
        defaultMessage(args: ValidationArguments): string {
          const dto = args.object as { ownerType?: SkillOwnerType };
          return dto.ownerType === ownerType
            ? `${property} must be a UUID for ${ownerType} ownership`
            : `${property} must not be provided for ${String(dto.ownerType)} ownership`;
        },
      },
    });
  };
}

export abstract class SkillListScopeDto {
  @ApiProperty({ enum: LIST_SCOPE_TYPES })
  @IsIn(LIST_SCOPE_TYPES)
  ownerType: SkillOwnerType.PERSONAL | SkillOwnerType.WORKSPACE;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwner(SkillOwnerType.WORKSPACE)
  workspaceId?: UUID;
}

export abstract class SkillOwnerDto {
  @ApiProperty({ enum: SkillOwnerType })
  @IsEnum(SkillOwnerType)
  ownerType: SkillOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwner(SkillOwnerType.WORKSPACE)
  workspaceId?: UUID;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsIdForOwner(SkillOwnerType.TEAM)
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
