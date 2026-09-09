import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { IsEnum, isUUID, registerDecorator } from 'class-validator';
import type { UUID } from 'crypto';
import type { SkillOwner } from 'src/domain/skills/application/models/skill-owner';

export enum SkillOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
}

function IsWorkspaceIdForOwner(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isWorkspaceIdForSkillOwner',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as SkillOwnerDto;
          if (dto.ownerType === SkillOwnerType.WORKSPACE) {
            return typeof value === 'string' && isUUID(value);
          }
          return value === undefined;
        },
        defaultMessage(args: ValidationArguments): string {
          const dto = args.object as SkillOwnerDto;
          return dto.ownerType === SkillOwnerType.WORKSPACE
            ? 'workspaceId must be a UUID for workspace ownership'
            : 'workspaceId must not be provided for personal ownership';
        },
      },
    });
  };
}

export abstract class SkillOwnerDto {
  @ApiProperty({ enum: SkillOwnerType })
  @IsEnum(SkillOwnerType)
  ownerType: SkillOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsWorkspaceIdForOwner()
  workspaceId?: UUID;
}

export function toSkillOwner(dto: SkillOwnerDto): SkillOwner {
  return dto.ownerType === SkillOwnerType.WORKSPACE
    ? { type: 'workspace', workspaceId: dto.workspaceId! }
    : { type: 'personal' };
}
