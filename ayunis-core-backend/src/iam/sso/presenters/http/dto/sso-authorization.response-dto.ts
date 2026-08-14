import { ApiProperty } from '@nestjs/swagger';

export class SsoAuthorizationResponseDto {
  @ApiProperty({
    example: 'https://sso.ayunis.de/oauth/v2/authorize?client_id=core',
  })
  authorizationUrl: string;
}
