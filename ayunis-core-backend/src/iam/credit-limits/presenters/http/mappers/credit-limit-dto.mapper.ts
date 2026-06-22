import { Injectable } from '@nestjs/common';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';
import type { UserCreditLimitOverviewItem } from '../../../application/use-cases/get-user-credit-limits-overview/user-credit-limit.view';
import type { TeamCreditLimitOverviewItem } from '../../../application/use-cases/get-team-credit-limits-overview/team-credit-limit.view';
import { CreditLimitResponseDto } from '../dtos/credit-limit-response.dto';
import {
  UserCreditLimitItemDto,
  TeamCreditLimitItemDto,
} from '../dtos/credit-limit-item.dto';

@Injectable()
export class CreditLimitDtoMapper {
  toDto(limit: CreditLimit): CreditLimitResponseDto {
    const { target } = limit;
    return {
      id: limit.id,
      scope: target.scope,
      targetId:
        target.scope === CreditLimitScope.USER ? target.userId : target.teamId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toUserItems(items: UserCreditLimitOverviewItem[]): UserCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }

  toTeamItems(items: TeamCreditLimitOverviewItem[]): TeamCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }
}
