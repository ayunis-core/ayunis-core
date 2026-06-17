import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class PromoteToSuperAdminDto {
  @ApiProperty({
    description: 'Email address of the user to promote to super admin',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
