import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({
    description: 'New name for the user',
    example: 'Maria Schmidt',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'New email address for the user',
    example: 'maria.schmidt@gemeinde.de',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;
}
