import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { IsEnum, isUUID, registerDecorator } from 'class-validator';
import type { UUID } from 'crypto';
import type { KnowledgeBaseOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export enum KnowledgeBaseOwnerType {
  PERSONAL = 'personal',
  WORKSPACE = 'workspace',
}

function IsWorkspaceIdForOwner(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isWorkspaceIdForKnowledgeBaseOwner',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as KnowledgeBaseOwnerDto;
          if (dto.ownerType === KnowledgeBaseOwnerType.WORKSPACE) {
            return typeof value === 'string' && isUUID(value);
          }
          return value === undefined;
        },
        defaultMessage(args: ValidationArguments): string {
          const dto = args.object as KnowledgeBaseOwnerDto;
          return dto.ownerType === KnowledgeBaseOwnerType.WORKSPACE
            ? 'workspaceId must be a UUID for workspace ownership'
            : 'workspaceId must not be provided for personal ownership';
        },
      },
    });
  };
}

export abstract class KnowledgeBaseOwnerDto {
  @ApiProperty({ enum: KnowledgeBaseOwnerType })
  @IsEnum(KnowledgeBaseOwnerType)
  ownerType: KnowledgeBaseOwnerType;

  @ApiPropertyOptional({ type: 'string', format: 'uuid' })
  @IsWorkspaceIdForOwner()
  workspaceId?: UUID;
}

export function toKnowledgeBaseOwner(
  dto: KnowledgeBaseOwnerDto,
): KnowledgeBaseOwner {
  return dto.ownerType === KnowledgeBaseOwnerType.WORKSPACE
    ? { type: 'workspace', workspaceId: dto.workspaceId! }
    : { type: 'personal' };
}
