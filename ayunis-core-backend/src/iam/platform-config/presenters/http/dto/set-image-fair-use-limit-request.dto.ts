import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetImageFairUseLimitRequestDto {
  @ApiProperty({
    description:
      'Maximum number of images allowed within the sliding window. Must be a positive integer.',
    example: 50,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  limit: number;

  @ApiProperty({
    description:
      'Sliding window duration in milliseconds. Must be a positive integer.',
    example: 86400000,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  windowMs: number;
}
