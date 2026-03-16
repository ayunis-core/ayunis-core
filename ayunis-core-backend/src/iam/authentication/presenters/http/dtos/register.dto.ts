import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidDepartment } from '../../../../users/domain/is-valid-department.validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address for the user account',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Password for the user account',
    example: 'password123',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'My Organization',
  })
  @IsNotEmpty()
  orgName: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  @IsNotEmpty()
  userName: string;

  @ApiProperty({
    description: 'Marketing acceptance',
    example: true,
  })
  marketingAcceptance: boolean;

  @ApiPropertyOptional({
    description: 'Department within the municipality',
    example: 'hauptamt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsValidDepartment()
  department?: string;
}
