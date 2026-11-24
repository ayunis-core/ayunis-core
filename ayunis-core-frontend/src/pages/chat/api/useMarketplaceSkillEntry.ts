import { useMarketplaceControllerGetSkill } from '@ayunis/api-client';

export function useMarketplaceSkillEntry(identifier: string) {
  const query = useMarketplaceControllerGetSkill(identifier, {
    query: { enabled: identifier.length > 0 },
  });

  return {
    skill: query.data,
    isLoading: query.isPending,
    isError: query.isError,
  };
}
