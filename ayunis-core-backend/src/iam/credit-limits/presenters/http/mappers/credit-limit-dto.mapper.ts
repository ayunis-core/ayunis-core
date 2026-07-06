import { Injectable } from '@nestjs/common';
import type { UserCreditLimit } from '../../../domain/user-credit-limit.entity';
import type { TeamCreditLimit } from '../../../domain/team-credit-limit.entity';
import type { UserCreditLimitOverviewItem } from '../../../application/use-cases/get-user-credit-limits-overview/user-credit-limit.view';
import type { TeamCreditLimitOverviewItem } from '../../../application/use-cases/get-team-credit-limits-overview/team-credit-limit.view';
import {
  UserCreditLimitResponseDto,
  TeamCreditLimitResponseDto,
} from '../dtos/credit-limit-response.dto';
import {
  UserCreditLimitItemDto,
  TeamCreditLimitItemDto,
} from '../dtos/credit-limit-item.dto';

@Injectable()
export class CreditLimitDtoMapper {
  toUserDto(limit: UserCreditLimit): UserCreditLimitResponseDto {
    return {
      id: limit.id,
      userId: limit.userId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toTeamDto(limit: TeamCreditLimit): TeamCreditLimitResponseDto {
    return {
      id: limit.id,
      teamId: limit.teamId,
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
