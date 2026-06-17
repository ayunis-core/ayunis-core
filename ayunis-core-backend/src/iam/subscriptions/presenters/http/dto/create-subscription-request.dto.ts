import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { BillingInfoFieldsDto } from './billing-info-fields.dto';
import { SubscriptionType } from '../../../domain/value-objects/subscription-type.enum';

export class CreateSubscriptionRequestDto extends BillingInfoFieldsDto {
  @ApiPropertyOptional({
    description: 'Subscription type. Defaults to SEAT_BASED if not specified.',
    enum: SubscriptionType,
    example: SubscriptionType.SEAT_BASED,
    default: SubscriptionType.SEAT_BASED,
  })
  @IsOptional()
  @IsEnum(SubscriptionType)
  type?: SubscriptionType;

  @ApiPropertyOptional({
    description: 'Number of seats for the subscription (seat-based only)',
    example: 10,
    minimum: 1,
    default: 1,
  })
  @ValidateIf(
    (o: CreateSubscriptionRequestDto) =>
      !o.type || o.type === SubscriptionType.SEAT_BASED,
  )
  @IsOptional()
  @IsNumber()
  @Min(1)
  noOfSeats?: number;

  @ApiPropertyOptional({
    description: 'Monthly credit budget (usage-based only)',
    example: 1000,
    minimum: 1,
  })
  @ValidateIf(
    (o: CreateSubscriptionRequestDto) =>
      o.type === SubscriptionType.USAGE_BASED,
  )
  @IsNumber()
  @Min(1)
  monthlyCredits?: number;

  @ApiProperty({
    description: 'Sub text for the subscription',
    example: 'Sub text',
    required: false,
  })
  @IsOptional()
  @IsString()
  subText?: string;

  @ApiPropertyOptional({
    description:
      'Start date for the subscription (ISO 8601). If omitted, the subscription starts immediately.',
    example: '2026-07-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;
}
