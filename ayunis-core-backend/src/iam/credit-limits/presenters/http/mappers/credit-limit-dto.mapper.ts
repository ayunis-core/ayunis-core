import { CreditLimitScope } from 'src/iam/credit-limits/domain/value-objects/credit-limit-scope.enum';
import { Injectable } from '@nestjs/common';
import type { ApiKeyCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-api-key-credit-limits-overview/api-key-credit-limit.view';
import type { AdminTeamCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-admin-team-credit-limits-overview/admin-team-credit-limit.view';
import type { AdminUserCreditLimitOverviewItem } from 'src/iam/credit-limits/application/use-cases/get-admin-user-credit-limits-overview/admin-user-credit-limit.view';
import type { DefaultUserCreditLimit } from 'src/iam/credit-limits/domain/default-user-credit-limit.entity';
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
  DefaultUserCreditLimitResponseDto,
  TeamCreditLimitResponseDto,
  UserCreditLimitResponseDto,
} from 'src/iam/credit-limits/presenters/http/dtos/credit-limit-response.dto';

@Injectable()
export class CreditLimitDtoMapper {
  toUserDto(limit: UserCreditLimit): UserCreditLimitResponseDto {
    return {
      id: limit.id,
      scope: CreditLimitScope.USER,
      userId: limit.userId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toApiKeyDto(limit: ApiKeyCreditLimit): ApiKeyCreditLimitResponseDto {
    return {
      id: limit.id,
      scope: CreditLimitScope.API_KEY,
      apiKeyId: limit.apiKeyId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toTeamDto(limit: TeamCreditLimit): TeamCreditLimitResponseDto {
    return {
      id: limit.id,
      scope: CreditLimitScope.TEAM,
      teamId: limit.teamId,
      monthlyCredits: limit.monthlyCredits,
    };
  }

  toDefaultUserDto(
    limit: DefaultUserCreditLimit | null,
  ): DefaultUserCreditLimitResponseDto {
    return {
      scope: CreditLimitScope.USER_DEFAULT,
      monthlyCredits: limit?.monthlyCredits ?? null,
    };
  }

  toUserItems(
    items: AdminUserCreditLimitOverviewItem[],
  ): UserCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }

  toApiKeyItems(
    items: ApiKeyCreditLimitOverviewItem[],
  ): ApiKeyCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }

  toTeamItems(
    items: AdminTeamCreditLimitOverviewItem[],
  ): TeamCreditLimitItemDto[] {
    return items.map((item) => ({ ...item }));
  }
}
