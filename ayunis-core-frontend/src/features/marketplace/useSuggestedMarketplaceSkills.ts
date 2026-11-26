import { useMarketplaceControllerListSuggestedSkills } from '@ayunis/api-client/endpoints';
import { useSkillMarketplaceUrl } from './useSkillMarketplaceUrl';

export function useSuggestedMarketplaceSkills() {
  const marketplaceUrl = useSkillMarketplaceUrl();
  const { data, isLoading } = useMarketplaceControllerListSuggestedSkills({
    query: { enabled: marketplaceUrl !== null },
  });

  return {
    marketplaceUrl,
    suggestions: marketplaceUrl === null ? [] : (data ?? []),
    isLoading,
  };
}
