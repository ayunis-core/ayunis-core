import { useMarketplaceConfig } from './useMarketplaceConfig';

export function useRoutineMarketplaceUrl(): string | null {
  const { enabled, url } = useMarketplaceConfig();

  if (!enabled || !url) return null;
  return url.endsWith('/') ? `${url}routines` : `${url}/routines`;
}
