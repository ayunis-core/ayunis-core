import { useAnonymizationSettingsControllerGet } from '@ayunis/api-client';

export function useOrgPiiWhitelist({ enabled }: { enabled: boolean }) {
  const query = useAnonymizationSettingsControllerGet({ query: { enabled } });

  return {
    entries: query.data?.entries,
    isError: query.isError,
  };
}
