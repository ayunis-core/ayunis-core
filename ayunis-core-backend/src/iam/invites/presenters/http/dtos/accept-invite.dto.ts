import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({
    description: 'JWT token from the invite',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  inviteToken: string;

  @ApiProperty({
    description: 'Name of the user accepting the invite',
    example: 'John Doe',
  })
  @IsString()
  userName: string;

  @ApiProperty({
    description: 'Password of the user accepting the invite',
    example: 'password',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description:
      'Confirmation of the password of the user accepting the invite',
    example: 'password',
  })
  @IsString()
  passwordConfirm: string;
}
