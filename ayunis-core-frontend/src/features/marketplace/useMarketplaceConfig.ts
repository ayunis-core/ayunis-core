import { useMarketplaceControllerGetConfig } from '@ayunis/api-client/endpoints';
import type { MarketplaceConfigResponseDto } from '@ayunis/api-client/schemas';

export function useMarketplaceConfig(): MarketplaceConfigResponseDto {
  const { data } = useMarketplaceControllerGetConfig();

  return {
    enabled: data?.enabled ?? false,
    url: data?.url ?? null,
  };
}
