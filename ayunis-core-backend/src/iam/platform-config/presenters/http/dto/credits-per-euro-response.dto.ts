import { ApiProperty } from '@nestjs/swagger';

export class CreditsPerEuroResponseDto {
  @ApiProperty({
    description: 'Number of credits per euro of token cost',
    example: 1000,
    type: Number,
  })
  creditsPerEuro: number;
}
