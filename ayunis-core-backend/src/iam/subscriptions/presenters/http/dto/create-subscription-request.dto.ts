import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { RenewalCycle } from '../../../domain/value-objects/renewal-cycle.enum';

export class CreateSubscriptionRequestDto {
  @ApiProperty({
    description: 'Number of seats for the subscription',
    example: 10,
    minimum: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  noOfSeats?: number;

  @ApiProperty({
    description: 'Renewal cycle of the subscription',
    enum: RenewalCycle,
    example: RenewalCycle.MONTHLY,
  })
  @IsEnum(RenewalCycle)
  renewalCycle: RenewalCycle;
}
