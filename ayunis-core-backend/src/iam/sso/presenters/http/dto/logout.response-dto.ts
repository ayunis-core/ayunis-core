import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Broker logout URL for the user agent, or null for Core-only logout',
  })
  brokerLogoutUrl: string | null;
}
