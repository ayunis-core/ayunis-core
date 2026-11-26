import { useMarketplaceControllerListSuggestedRoutines } from '@ayunis/api-client/endpoints';
import { useRoutineMarketplaceUrl } from './useRoutineMarketplaceUrl';

export function useSuggestedMarketplaceRoutines() {
  const marketplaceUrl = useRoutineMarketplaceUrl();
  const { data } = useMarketplaceControllerListSuggestedRoutines({
    query: { enabled: marketplaceUrl !== null },
  });

  return {
    marketplaceUrl,
    suggestions: marketplaceUrl === null ? [] : (data ?? []),
  };
}
