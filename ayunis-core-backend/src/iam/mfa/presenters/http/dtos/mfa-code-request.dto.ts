import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MfaCodeRequestDto {
  @ApiProperty({
    description:
      'A 6-digit TOTP code from the authenticator app, or a single-use ' +
      'recovery code (XXXXX-XXXXX).',
    example: '123456',
  })
  @IsString()
  @Length(6, 11)
  code: string;
}
