import { Injectable } from '@nestjs/common';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import type { CreditLimitsOverview } from '../../../application/use-cases/get-credit-limits-overview/credit-limits-overview.view';
import { CreditLimitResponseDto } from '../dtos/credit-limit-response.dto';
import { CreditLimitsOverviewResponseDto } from '../dtos/credit-limits-overview-response.dto';

@Injectable()
export class CreditLimitDtoMapper {
  toDto(limit: CreditLimit): CreditLimitResponseDto {
    const { target } = limit;
    return {
      id: limit.id,
      scope: target.scope,
      targetUserId:
        target.scope === CreditLimitScope.USER ? target.userId : null,
      targetTeamId:
        target.scope === CreditLimitScope.TEAM ? target.teamId : null,
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
