import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
    minLength: 8,
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password cannot be empty' })
  @MinLength(8, { message: 'Current password must be at least 8 characters' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'newPassword123!',
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password cannot be empty' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of the new password',
    example: 'newPassword123!',
    minLength: 8,
  })
  @IsString({ message: 'Password confirmation must be a string' })
  @IsNotEmpty({ message: 'Password confirmation cannot be empty' })
  @MinLength(8, {
    message: 'Password confirmation must be at least 8 characters',
  })
  newPasswordConfirmation: string;
}
