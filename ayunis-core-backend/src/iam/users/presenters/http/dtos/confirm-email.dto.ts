import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty({
    description: 'JWT token for email confirmation',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token cannot be empty' })
  token: string;
}
