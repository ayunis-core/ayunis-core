import { useUsageControllerGetUsageConfig } from '@ayunis/api-client';

export function useUsageConfig() {
  return useUsageControllerGetUsageConfig({
    query: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchInterval: 5000,
    },
  });
}
