import { IsInt, Min } from 'class-validator';

export class UpdateMonthlyCreditsDto {
  @IsInt()
  @Min(0)
  monthlyCredits: number;
}
