import { ApiProperty } from '@nestjs/swagger';

export class CreditUsageResponseDto {
  @ApiProperty({
    description:
      'Monthly credit budget from the usage-based subscription. Null if the org does not have a usage-based subscription.',
    example: 10000,
    type: Number,
    nullable: true,
  })
  monthlyCredits: number | null;

  @ApiProperty({
    description: 'Total credits consumed in the current calendar month.',
    example: 4250.5,
  })
  creditsUsed: number;

  @ApiProperty({
    description:
      'Credits remaining this month (monthlyCredits - creditsUsed). Null if the org does not have a usage-based subscription.',
    example: 5749.5,
    type: Number,
    nullable: true,
  })
  creditsRemaining: number | null;
}
