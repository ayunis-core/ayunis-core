import { useMarketplaceControllerGetConfig } from '@/shared/api/generated/ayunisCoreAPI';
import type { MarketplaceConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function useMarketplaceConfig(): MarketplaceConfigResponseDto {
  const { data } = useMarketplaceControllerGetConfig();

  return {
    enabled: data?.enabled ?? false,
    url: data?.url ?? null,
  };
}
