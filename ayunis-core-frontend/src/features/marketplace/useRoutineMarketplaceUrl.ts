import { useMyPermissions } from '@/features/permissions';
import { useMarketplaceConfig } from './useMarketplaceConfig';

export function useRoutineMarketplaceUrl(): string | null {
  const { enabled, url } = useMarketplaceConfig();
  const { can } = useMyPermissions();

  if (!enabled || !url) return null;
  if (!can('manage_routines') || !can('install_marketplace_routines')) {
    return null;
  }
  return url.endsWith('/') ? `${url}routines` : `${url}/routines`;
}
