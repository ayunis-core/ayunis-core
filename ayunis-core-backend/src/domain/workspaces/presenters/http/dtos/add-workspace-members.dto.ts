import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import type { UUID } from 'crypto';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class AddWorkspaceMembersDto {
  @ApiProperty({
    description: 'Users of the same organization to add',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  userIds: UUID[];

  @ApiPropertyOptional({
    description:
      'Workspace role for every added user; only workspace admins may assign admin',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
