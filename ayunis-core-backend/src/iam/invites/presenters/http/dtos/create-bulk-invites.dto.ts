import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
  ArrayUnique,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateBulkInviteItemDto {
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
    description:
      'Names of teams to assign after the invited user joins the organization',
    type: [String],
    example: ['Research', 'Operations'],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  teamNames?: string[];
}

export class CreateBulkInvitesDto {
  @ApiProperty({
    description: 'Array of invites to create',
    type: [CreateBulkInviteItemDto],
    maxItems: 500,
    minItems: 1,
  })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBulkInviteItemDto)
  invites: CreateBulkInviteItemDto[];
}
