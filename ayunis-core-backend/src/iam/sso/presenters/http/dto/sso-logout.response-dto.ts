import { ApiProperty } from '@nestjs/swagger';

export class SsoLogoutResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({
    nullable: true,
    description:
      'Broker logout URL for the user agent, or null for Core-only logout',
  })
  brokerLogoutUrl: string | null;
}
