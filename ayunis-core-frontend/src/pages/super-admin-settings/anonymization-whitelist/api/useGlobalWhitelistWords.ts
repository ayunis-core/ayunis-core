import { useMemo } from 'react';
import { useSuperAdminAnonymizationWhitelistControllerList } from '@ayunis/api-client';
import { groupWordsByCategory } from '@/pages/super-admin-settings/anonymization-whitelist/lib/group-words';

export function useGlobalWhitelistWords() {
  const { data, isLoading, isError, refetch } =
    useSuperAdminAnonymizationWhitelistControllerList();

  const wordsByCategory = useMemo(
    () => groupWordsByCategory(data ?? []),
    [data],
  );

  return { wordsByCategory, isLoading, isError, refetch };
}
