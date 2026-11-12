import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetRecordingFairUseLimitRequestDto {
  @ApiProperty({
    description:
      'Maximum number of recording uploads a user may start within the sliding window. Must be a positive integer.',
    example: 5,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  limit: number;

  @ApiProperty({
    description:
      'Sliding window duration in milliseconds. Must be a positive integer.',
    example: 3600000,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  windowMs: number;
}
