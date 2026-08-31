import { Injectable } from '@nestjs/common';
import type { ApiKeyCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-api-key-credit-limits-overview/api-key-credit-limit.view';
import type { TeamCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/team-credit-limit.view';
import type { UserCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-user-credit-limits-overview/user-credit-limit.view';
import type { ApiKeyCreditLimit } from 'src/iam/credit-limits/domain/api-key-credit-limit.entity';
import type { TeamCreditLimit } from 'src/iam/credit-limits/domain/team-credit-limit.entity';
import type { UserCreditLimit } from 'src/iam/credit-limits/domain/user-credit-limit.entity';
import {
  ApiKeyCreditLimitItemDto,
  TeamCreditLimitItemDto,
  UserCreditLimitItemDto,
} from 'src/iam/credit-limits/presenters/http/dtos/credit-limit-item.dto';
import {
  ApiKeyCreditLimitResponseDto,
  TeamCreditLimitResponseDto,
  UserCreditLimitResponseDto,
} from 'src/iam/credit-limits/presenters/http/dtos/credit-limit-response.dto';

@Injectable()
export class CreditLimitDtoMapper {
  toUserDto(limit: UserCreditLimit): UserCreditLimitResponseDto {
    return {
      id: limit.id,
      userId: limit.userId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toApiKeyDto(limit: ApiKeyCreditLimit): ApiKeyCreditLimitResponseDto {
    return {
      id: limit.id,
      apiKeyId: limit.apiKeyId,
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

  toApiKeyItems(
    items: ApiKeyCreditLimitOverviewItem[],
  ): ApiKeyCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }

  toTeamItems(items: TeamCreditLimitOverviewItem[]): TeamCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }
}
