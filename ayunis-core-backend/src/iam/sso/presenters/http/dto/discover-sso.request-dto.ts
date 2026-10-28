import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class DiscoverSsoDto {
  @ApiProperty({ example: 'staff@stadt.example' })
  @IsEmail()
  email: string;
}
