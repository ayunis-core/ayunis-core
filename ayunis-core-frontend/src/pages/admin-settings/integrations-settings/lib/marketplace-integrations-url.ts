import type { MarketplaceConfigResponseDto } from '@ayunis/api-client/schemas';

export function marketplaceIntegrationsUrl({
  enabled,
  url,
}: MarketplaceConfigResponseDto): string | null {
  return enabled && url ? `${url.replace(/\/$/, '')}/integrations` : null;
}
