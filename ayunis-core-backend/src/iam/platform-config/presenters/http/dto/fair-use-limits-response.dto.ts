import { ApiProperty } from '@nestjs/swagger';

export class FairUseTierLimitDto {
  @ApiProperty({
    description: 'Maximum number of messages allowed within the window',
    example: 200,
    type: Number,
  })
  limit: number;

  @ApiProperty({
    description: 'Sliding window duration in milliseconds',
    example: 10800000,
    type: Number,
  })
  windowMs: number;
}

export class FairUseLimitsResponseDto {
  @ApiProperty({
    description: 'Fair-use limit for low-tier (cheap) language models',
    type: FairUseTierLimitDto,
  })
  low: FairUseTierLimitDto;

  @ApiProperty({
    description: 'Fair-use limit for medium-tier language models',
    type: FairUseTierLimitDto,
  })
  medium: FairUseTierLimitDto;

  @ApiProperty({
    description: 'Fair-use limit for high-tier (expensive) language models',
    type: FairUseTierLimitDto,
  })
  high: FairUseTierLimitDto;
}
