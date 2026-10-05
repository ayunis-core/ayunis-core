import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { UUID } from 'crypto';

export class SubscriptionAccessEndAdjustmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subscriptionId: UUID;

  @ApiProperty({
    description: 'Exclusive end of product access for this subscription',
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsISO8601({ strict: true })
  accessEndsAt: string;
}

export class ResolveSubscriptionOverlapDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  authoritativeSubscriptionId: UUID;

  @ApiProperty({ type: [SubscriptionAccessEndAdjustmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubscriptionAccessEndAdjustmentDto)
  adjustments: SubscriptionAccessEndAdjustmentDto[];

  @ApiProperty({
    description: 'Audit reason for correcting the subscription access periods',
    example: 'AYC-1158: usage contract replaced seat contract',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
