import { useMarketplaceControllerGetConfig } from '@/shared/api/generated/ayunisCoreAPI';
import type { MarketplaceConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface MarketplaceConfig extends MarketplaceConfigResponseDto {
  termsOfServiceUrl: string | null;
}

export function useMarketplaceConfig(): MarketplaceConfig {
  const { data } = useMarketplaceControllerGetConfig();

  const url = data?.url ?? null;

  return {
    enabled: data?.enabled ?? false,
    url,
    termsOfServiceUrl: url
      ? `${url.replace(/\/$/, '')}/nutzungsbedingungen`
      : null,
  };
}
