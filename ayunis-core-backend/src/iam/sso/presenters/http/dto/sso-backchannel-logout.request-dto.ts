import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_LOGOUT_TOKEN_LENGTH = 16_384;

export class SsoBackchannelLogoutRequestDto {
  @ApiProperty({
    description: 'Signed OpenID Connect logout token',
    maxLength: MAX_LOGOUT_TOKEN_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_LOGOUT_TOKEN_LENGTH)
  logout_token: string;
}
