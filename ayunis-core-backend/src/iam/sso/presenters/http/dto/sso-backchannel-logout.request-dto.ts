import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SsoBackchannelLogoutRequestDto {
  @ApiProperty({ description: 'Signed OpenID Connect logout token' })
  @IsString()
  @IsNotEmpty()
  logout_token: string;
}
