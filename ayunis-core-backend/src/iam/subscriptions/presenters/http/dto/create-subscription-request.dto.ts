import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BillingInfoFieldsDto } from './billing-info-fields.dto';

export class CreateSubscriptionRequestDto extends BillingInfoFieldsDto {
  @ApiPropertyOptional({
    description: 'Number of seats for the subscription (seat-based only)',
    example: 10,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  noOfSeats?: number;

  @ApiProperty({
    description: 'Sub text for the subscription',
    example: 'Sub text',
    required: false,
  })
  @IsOptional()
  @IsString()
  subText?: string;
}
