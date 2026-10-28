import { useSkillsControllerFindInstalledFromMarketplace } from '@/shared/api';

export function useInstalledMarketplaceSkill(identifier: string) {
  const query = useSkillsControllerFindInstalledFromMarketplace(identifier, {
    query: { enabled: identifier.length > 0 },
  });

  return {
    installedSkillId: query.data?.skillId ?? null,
    // False once the lookup answered or failed. A failed lookup means
    // "unknown", and the card still offers Install rather than staying blank.
    isLoading: query.isLoading,
  };
}
