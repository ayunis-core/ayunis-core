import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

export class CreateUserDto {
  @ApiProperty({
    description: 'Email address for the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Name of the user',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Role for the user',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be either admin or user',
  })
  role: UserRole;

  @ApiProperty({
    description: 'Send the account activation (welcome) email to the new user',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  sendActivationEmail?: boolean;
}
