import { ApiProperty } from '@nestjs/swagger';

export class IpAllowlistResponseDto {
  @ApiProperty({
    description: 'List of allowed CIDR ranges',
    example: ['203.0.113.0/24'],
    type: [String],
  })
  cidrs: string[];
}
