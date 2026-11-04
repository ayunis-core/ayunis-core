import { ApiProperty } from '@nestjs/swagger';

export class SsoAccountLinkStatusResponseDto {
  @ApiProperty()
  canLink: boolean;

  @ApiProperty()
  isLinked: boolean;
}
