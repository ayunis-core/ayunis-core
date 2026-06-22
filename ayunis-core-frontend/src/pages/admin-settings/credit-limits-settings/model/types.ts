import type {
  CreditLimitsOverviewResponseDto,
  UserCreditLimitItemDto,
  TeamCreditLimitItemDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type CreditLimitsOverview = CreditLimitsOverviewResponseDto;
export type UserCreditLimitItem = UserCreditLimitItemDto;
export type TeamCreditLimitItem = TeamCreditLimitItemDto;

export type CreditLimitScope = 'user' | 'team';

export interface SetCreditLimitFormData {
  targetId: string;
  monthlyCredits: number;
}
