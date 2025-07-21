import { ApiProperty } from '@nestjs/swagger';

export class PriceResponseDto {
  @ApiProperty({
    description: 'Current price per seat per month in the configured currency',
    example: 29.99,
  })
  pricePerSeatMonthly: number;
}
