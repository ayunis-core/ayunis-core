import { useMyPermissions } from '@/features/permissions';
import { useMarketplaceConfig } from './useMarketplaceConfig';

export function useSkillMarketplaceUrl(): string | null {
  const marketplace = useMarketplaceConfig();
  const { can } = useMyPermissions();

  if (!marketplace.enabled || !marketplace.url) return null;
  return can('install_marketplace_skills') ? marketplace.url : null;
}
