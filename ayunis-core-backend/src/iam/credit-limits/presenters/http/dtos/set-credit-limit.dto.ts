import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class SetCreditLimitDto {
  @ApiProperty({
    description:
      'The monthly credit allowance. 0 freezes the target entirely; ' +
      'remove the limit to make the target unlimited within the org budget.',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  monthlyCredits: number;
}
