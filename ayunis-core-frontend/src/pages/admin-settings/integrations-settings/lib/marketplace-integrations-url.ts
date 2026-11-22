import type { MarketplaceConfigResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function marketplaceIntegrationsUrl({
  enabled,
  url,
}: MarketplaceConfigResponseDto): string | null {
  return enabled && url ? `${url.replace(/\/$/, '')}/integrations` : null;
}
