import type { UUID } from 'crypto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  ArrayMaxSize,
} from 'class-validator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateInviteDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Organization teams to assign on acceptance',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  teamIds?: UUID[];
}
