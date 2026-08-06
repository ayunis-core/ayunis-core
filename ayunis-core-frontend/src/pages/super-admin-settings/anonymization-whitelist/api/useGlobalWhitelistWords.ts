import { useMemo } from 'react';
import { useSuperAdminAnonymizationWhitelistControllerList } from '@/shared/api';
import { groupWordsByCategory } from '../lib/group-words';

export function useGlobalWhitelistWords() {
  const { data, isLoading, isError, refetch } =
    useSuperAdminAnonymizationWhitelistControllerList();

  const wordsByCategory = useMemo(
    () => groupWordsByCategory(data ?? []),
    [data],
  );

  return { wordsByCategory, isLoading, isError, refetch };
}
