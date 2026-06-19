import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../../../../users/domain/value-objects/role.object';

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

  @ApiProperty({
    description:
      'When true, the invite is created without sending the invitation email. ' +
      'The invitation can be dispatched later via the send-prepared endpoint.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  prepared?: boolean;
}
