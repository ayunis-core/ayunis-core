import { Injectable } from '@nestjs/common';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import type { CreditLimitsOverview } from '../../../application/use-cases/get-credit-limits-overview/credit-limits-overview.view';
import { CreditLimitResponseDto } from '../dtos/credit-limit-response.dto';
import { CreditLimitsOverviewResponseDto } from '../dtos/credit-limits-overview-response.dto';

@Injectable()
export class CreditLimitDtoMapper {
  toDto(limit: CreditLimit): CreditLimitResponseDto {
    return {
      id: limit.id,
      scope: limit.scope,
      targetUserId: limit.targetUserId,
      targetTeamId: limit.targetTeamId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toOverviewDto(
    overview: CreditLimitsOverview,
  ): CreditLimitsOverviewResponseDto {
    return {
      users: overview.users.map((item) => ({ ...item })),
      teams: overview.teams.map((item) => ({ ...item })),
    };
  }
}
