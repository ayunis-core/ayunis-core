import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';

export class SetFairUseLimitRequestDto {
  @ApiProperty({
    description: 'Model tier whose fair-use limit is being updated',
    enum: ModelTier,
    example: ModelTier.MEDIUM,
  })
  @IsEnum(ModelTier)
  tier: ModelTier;

  @ApiProperty({
    description:
      'Maximum number of messages allowed within the sliding window. Must be a positive integer.',
    example: 200,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  limit: number;

  @ApiProperty({
    description:
      'Sliding window duration in milliseconds. Must be a positive integer.',
    example: 10800000,
    minimum: 1,
    type: Number,
  })
  @IsInt()
  @Min(1)
  windowMs: number;
}
