import { ApiProperty } from '@nestjs/swagger';

export class SsoDiscoveryResponseDto {
  @ApiProperty()
  available: boolean;

  @ApiProperty({ format: 'uuid', required: false })
  orgId?: string;
}
