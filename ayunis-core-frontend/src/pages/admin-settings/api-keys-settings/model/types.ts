import type {
  ApiKeyCreditLimitItemDto,
  ApiKeyResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type ApiKey = ApiKeyResponseDto;
export type ApiKeyCreditLimit = ApiKeyCreditLimitItemDto;

export interface ApiKeyCreditLimitFormValues {
  monthlyCredits?: number;
}

export type { CreateApiKeyFormValues } from './createApiKeyFormSchema';
