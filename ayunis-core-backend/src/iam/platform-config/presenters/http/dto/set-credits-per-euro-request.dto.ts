import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class SetCreditsPerEuroRequestDto {
  @ApiProperty({
    description: 'Number of credits per euro of token cost. Must be positive.',
    example: 1000,
    type: Number,
  })
  @IsNumber()
  @IsPositive()
  creditsPerEuro: number;
}
